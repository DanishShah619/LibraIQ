import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTransactionalEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("[email:send]", err);
  }
}

// ── Template helpers ──────────────────────────────────────────────────────────

export function badgeEarnedEmail(firstName: string, badgeName: string, badgeDescription: string): string {
  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#fff;border-radius:12px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:32px;text-align:center">
        <div style="font-size:56px;margin-bottom:12px">🏆</div>
        <h1 style="margin:0;font-size:24px;font-weight:700">Badge Earned!</h1>
      </div>
      <div style="padding:32px">
        <p style="color:#94a3b8;margin-top:0">Hi <strong style="color:#fff">${firstName}</strong>,</p>
        <p style="color:#94a3b8">Congratulations! You just unlocked a new badge:</p>
        <div style="background:#1e293b;border-radius:8px;padding:20px;margin:20px 0;text-align:center">
          <p style="margin:0;font-size:20px;font-weight:700;color:#fff">${badgeName}</p>
          <p style="margin:8px 0 0;color:#64748b;font-size:14px">${badgeDescription}</p>
        </div>
        <p style="color:#94a3b8">Keep reading to unlock more badges and climb the leaderboard!</p>
        <a href="${process.env.NEXTAUTH_URL}/leaderboard" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          View Leaderboard
        </a>
      </div>
    </div>
  `;
}

export function levelUpEmail(firstName: string, newLevel: string): string {
  const levelEmojis: Record<string, string> = {
    Explorer: "🌍",
    Scholar: "📚",
    Bibliophile: "🦉",
    "Grand Archivist": "👑",
  };
  const emoji = levelEmojis[newLevel] || "⬆️";

  return `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0f172a;color:#fff;border-radius:12px;overflow:hidden">
      <div style="background:linear-gradient(135deg,#059669,#0284c7);padding:32px;text-align:center">
        <div style="font-size:56px;margin-bottom:12px">${emoji}</div>
        <h1 style="margin:0;font-size:24px;font-weight:700">Level Up!</h1>
      </div>
      <div style="padding:32px">
        <p style="color:#94a3b8;margin-top:0">Hi <strong style="color:#fff">${firstName}</strong>,</p>
        <p style="color:#94a3b8">Amazing progress! You've reached a new level:</p>
        <div style="background:#1e293b;border-radius:8px;padding:20px;margin:20px 0;text-align:center">
          <p style="margin:0;font-size:28px;font-weight:800;color:#38bdf8">${newLevel}</p>
        </div>
        <p style="color:#94a3b8">Your reading streak is paying off. Check your profile to see your progress!</p>
        <a href="${process.env.NEXTAUTH_URL}/profile" style="display:inline-block;margin-top:8px;padding:12px 24px;background:#0284c7;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          View Profile
        </a>
      </div>
    </div>
  `;
}
