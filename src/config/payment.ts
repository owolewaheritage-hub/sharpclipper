export const BANK_PAYMENT_DETAILS = {
  bankName: 'OPay',
  accountNumber: '7085221035',
  accountName: 'SharpClipper',
  whatsappNumber: '2347085221035',
} as const;

export const FREE_MONTHLY_CLIP_LIMIT = 3;
export const PRO_PRICE_NGN = 5000;
export const PRO_PRICE_USD = 5;
export const SINGLE_CLIP_PRICE_NGN = 500;

export function buildWhatsAppReceiptUrl(params: {
  planTitle: string;
  amountNgn: number;
  userEmail: string;
  reference: string;
}): string {
  const emailLine =
    params.userEmail && params.userEmail !== 'guest@sharpclipper.local'
      ? `\nAccount Email: ${params.userEmail}`
      : '';
  const message =
    `Hello SharpClipper, I have made a bank transfer payment.\n` +
    `Plan: ${params.planTitle}\n` +
    `Amount: ₦${params.amountNgn.toLocaleString('en-NG')}\n` +
    `Bank: ${BANK_PAYMENT_DETAILS.bankName} (${BANK_PAYMENT_DETAILS.accountNumber})\n` +
    `Reference: ${params.reference}` +
    emailLine +
    `\n\nPlease find my payment receipt attached.`;

  return `https://wa.me/${BANK_PAYMENT_DETAILS.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
