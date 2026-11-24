export type AuthenticatedUser = {
  readonly id: string;
  readonly email: string | null;
  readonly name: string | null;
  readonly avatar: string | null;
};

export interface TokenVerifier {
  verify(token: string): Promise<AuthenticatedUser>;
}
