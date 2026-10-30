import { useAuth } from '../auth.jsx';
import LoginForm from '../components/LoginForm.jsx';

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="grid min-h-screen place-items-center bg-muted p-4">
      <LoginForm onLogin={login} />
    </div>
  );
}
