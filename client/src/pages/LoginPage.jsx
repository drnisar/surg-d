import { useAuth } from '../auth.jsx';
import LoginForm from '../components/LoginForm.jsx';

export default function LoginPage() {
  const { login } = useAuth();

  return (
    <div className="login">
      <LoginForm onLogin={login} />
    </div>
  );
}
