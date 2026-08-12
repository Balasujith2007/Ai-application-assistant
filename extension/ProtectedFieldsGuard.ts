export class ProtectedFieldsGuard {
  private static protectedKeywords = [
    'otp',
    'password',
    'passcode',
    'captcha',
    'cvv',
    'card',
    'credit',
    'debit',
    'payment',
    'transaction',
    'utr',
    'upi',
    'screenshot',
    'receipt',
    'team',
    'signature',
    'declaration',
    'agree',
    'terms'
  ];

  public static isProtectedField(metadata: {
    id?: string;
    name?: string;
    placeholder?: string;
    label?: string;
    type?: string;
  }): boolean {
    const type = (metadata.type || '').toLowerCase();
    if (type === 'password' || type === 'hidden') return true;

    const haystack = [
      metadata.id,
      metadata.name,
      metadata.placeholder,
      metadata.label
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return this.protectedKeywords.some((keyword) => haystack.includes(keyword));
  }
}
