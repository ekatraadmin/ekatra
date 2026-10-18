
import { useEffect } from "react";
import "./AdUnit.css";

export default function AdUnit() {
  const client = import.meta.env.VITE_ADSENSE_CLIENT;
  const slot = import.meta.env.VITE_ADSENSE_DASHBOARD_SLOT;

  useEffect(() => {
    // Real ads only on the deployed production website.
    if (!import.meta.env.PROD || !client || !slot) return;

    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch (error) {
      console.error("AdSense error:", error);
    }
  }, [client, slot]);

  if (!import.meta.env.PROD || !client || !slot) {
    return (
      <div className="dashboard-ad-placeholder">
        <span>ADVERTISEMENT</span>
        <p>Your dashboard ad will appear here after setup.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-ad-container">
      <span className="dashboard-ad-label">
        Advertisement
      </span>

      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: "90px" }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
