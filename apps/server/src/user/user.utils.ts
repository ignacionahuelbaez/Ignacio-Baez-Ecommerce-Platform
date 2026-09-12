// Strips fields that should never leave the server, regardless of API surface (REST/GraphQL).
export function sanitizeUser<T extends Record<string, any>>(user: T): Omit<
  T,
  'password' | 'resetPasswordToken' | 'resetPasswordExpires' | 'emailVerifyToken'
> {
  const {
    password: _password,
    resetPasswordToken: _resetPasswordToken,
    resetPasswordExpires: _resetPasswordExpires,
    emailVerifyToken: _emailVerifyToken,
    ...safeUser
  } = user;

  return safeUser;
}
