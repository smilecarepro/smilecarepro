import React from "react";
import { useAuth } from "../AuthContext";
import DoctorDashboard from "./DoctorDashboard";
import SecretaryDashboard from "./SecretaryDashboard";

export default function Home() {
  const { user } = useAuth();
  const isSecretary = user?.role === "secretary";

  if (isSecretary) {
    return <SecretaryDashboard />;
  }

  return <DoctorDashboard />;
}
