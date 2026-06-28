import struct
import json
import os

glb_path = r"c:\Users\Dell\Desktop\claude 1 - Copy - Copy - Copy\claude 1 - Copy - Copy - Copy\dental-clinic\frontend\public\second.glb"

def inspect_glb():
    with open(glb_path, "rb") as f:
        f.read(12)
        chunk_header = f.read(8)
        chunk_length, chunk_type = struct.unpack("<II", chunk_header)
        json_data = f.read(chunk_length)
        gltf = json.loads(json_data.decode("utf-8"))
        
        materials = gltf.get("materials", [])
        print("Total materials:", len(materials))
        for idx, mat in enumerate(materials[:20]):
            name = mat.get("name", f"mat_{idx}")
            pbr = mat.get("pbrMetallicRoughness", {})
            base_color = pbr.get("baseColorFactor", "Not specified")
            metallic = pbr.get("metallicFactor", "Not specified")
            roughness = pbr.get("roughnessFactor", "Not specified")
            extensions = mat.get("extensions", {})
            unlit = "KHR_materials_unlit" in extensions
            print(f"Material {idx}: {name} | PBR BaseColor: {base_color} | Metallic: {metallic} | Roughness: {roughness} | Unlit: {unlit}")
            
if __name__ == "__main__":
    inspect_glb()
