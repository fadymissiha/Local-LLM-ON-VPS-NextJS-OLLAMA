import nodemailer from "nodemailer";

function getEmailConfig() {
  return {
    host: process.env.AUTH_SMTP_HOST || "",
    port: Number(process.env.AUTH_SMTP_PORT || 587),
    user: process.env.AUTH_SMTP_USER || "",
    pass: process.env.AUTH_SMTP_PASS || "",
    from: process.env.AUTH_SMTP_FROM || process.env.AUTH_SMTP_USER || "",
  };
}

export async function sendVerificationCode(email: string, code: string) {
  const { host, port, user, pass, from } = getEmailConfig();

  if (!host || !user || !pass || !from) {
    throw new Error("Email delivery is not configured. Set SMTP environment variables.");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });

  try {
    await transporter.verify();
    await transporter.sendMail({
      from,
      to: email,
      subject: "Your Fast sign-in code",
      text: `Use this code to sign in: ${code}`,
      html: `<p>Your Fast sign-in code is <strong>${code}</strong>.</p><p>This code expires in 15 minutes.</p>`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown SMTP error";
    throw new Error(`SMTP send failed: ${message}`);
  }
}
