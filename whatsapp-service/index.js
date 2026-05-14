const wppconnect = require('@wppconnect-team/wppconnect');
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const port = 3001;
const sessions = {};

// دالة لإنشاء جلسة جديدة باستخدام WPPConnect
const createSession = async (clinicId) => {
    if (sessions[clinicId]) return sessions[clinicId];

    sessions[clinicId] = { status: 'loading', qr: null, client: null };

    try {
        const client = await wppconnect.create({
            session: clinicId,
            catchQR: (base64Qrimg, asciiQR, attempts, urlCode) => {
                sessions[clinicId].status = 'qr';
                sessions[clinicId].qr = base64Qrimg;
            },
            statusFind: (statusSession, session) => {
                if (statusSession === 'isLogged' || statusSession === 'qrReadSuccess') {
                    sessions[clinicId].status = 'ready';
                }
            },
            headless: true,
            useChrome: true,
            autoClose: 0, // تعطيل الإغلاق التلقائي ليعطيك وقتاً للمسح
            updatesLog: false,
            browserArgs: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        sessions[clinicId].client = client;
        sessions[clinicId].status = 'ready';

        // الاستماع للرسائل
        client.onMessage(async (message) => {
            if (message.isGroupMsg) return;
            
            try {
                const backend = process.env.BACKEND_URL || "http://localhost:5050";
                await axios.post(`${backend}/api/whatsapp/webhook?clinic=${clinicId}`, {
                    from: message.from,
                    body: message.body,
                    senderName: message.sender.name
                });
            } catch (err) {
                console.error('Error forwarding to Flask:', err.message);
            }
        });

    } catch (err) {
        console.error(`Error creating session for ${clinicId}:`, err);
        delete sessions[clinicId];
    }
};

app.get('/qr/:clinicId', async (req, res) => {
    const { clinicId } = req.params;
    
    if (!sessions[clinicId]) {
        createSession(clinicId);
        return res.json({ status: 'loading' });
    }

    const session = sessions[clinicId];
    res.json({
        status: session.status,
        qr: session.qr
    });
});

app.post('/send', async (req, res) => {
    const { clinicId, to, message } = req.body;
    const session = sessions[clinicId];

    if (!session || session.status !== 'ready') {
        return res.status(400).json({ error: 'Session not ready' });
    }

    try {
        await session.client.sendText(to, message);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`WPPConnect Gateway running on http://localhost:${port}`);
});
