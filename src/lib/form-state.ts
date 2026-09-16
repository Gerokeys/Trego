/** Result of a small useActionState form: an error to show, or done. */
export type FormState = { error: string | null; done?: boolean };

export const initialFormState: FormState = { error: null };
