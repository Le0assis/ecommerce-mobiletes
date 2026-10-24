export type OutboundMail = {
  to: string;
  subject: string;
  text: string;
};

export type Mailer = {
  send(mail: OutboundMail): Promise<void>;
};

export class MailUnavailable extends Error {
  readonly status = 503 as const;
  readonly code = "email_indisponivel" as const;

  constructor() {
    super("Não foi possível enviar o código.");
  }
}

export function createMailer(): Mailer {
  const url = process.env.MAILER_URL?.trim();
  if (url) {
    return {
      async send(mail) {
        const response = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(mail),
        });
        if (!response.ok) throw new MailUnavailable();
      },
    };
  }
  if (process.env.NODE_ENV === "production") {
    return {
      async send() {
        throw new MailUnavailable();
      },
    };
  }
  return {
    async send(mail) {
      console.info(JSON.stringify({ msg: "mail_log", to: mail.to, subject: mail.subject, text: mail.text }));
    },
  };
}
