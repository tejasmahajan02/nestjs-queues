export const MailJobNames = {
  SEND: 'mail.send',
  NOTIFY: 'mail.notify',
} as const;

export type MailJobName = (typeof MailJobNames)[keyof typeof MailJobNames];
