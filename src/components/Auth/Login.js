// src/components/Auth/Login.js
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { ChefHat } from 'lucide-react';

const Login = ({ setCurrentView }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validaciones básicas
    if (!email || !password) {
      setError('Por favor completa todos los campos');
      setLoading(false);
      return;
    }

    try {
      // Intentar iniciar sesión con Firebase
      await signInWithEmailAndPassword(auth, email, password);
      // Si tiene éxito, onAuthStateChanged en App.js lo detectará automáticamente
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      
      // Mensajes de error personalizados
      switch (error.code) {
        case 'auth/user-not-found':
          setError('No existe una cuenta con este correo');
          break;
        case 'auth/wrong-password':
          setError('Contraseña incorrecta');
          break;
        case 'auth/invalid-email':
          setError('Correo electrónico inválido');
          break;
        case 'auth/too-many-requests':
          setError('Demasiados intentos fallidos. Intenta más tarde');
          break;
        default:
          setError('Error al iniciar sesión. Verifica tus credenciales');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-emerald-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ChefHat className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-800">Ready To Cook</h1>
          <p className="text-gray-600 mt-2">Gestiona tus alimentos, crea recetas</p>
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" 
              placeholder="tucorreo@ejemplo.com"
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent" 
              placeholder="Ingresa tu contraseña"
              disabled={loading}
            />
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
          
          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => setCurrentView('recovery')}
              className="text-emerald-600 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
          
          <div className="text-center text-sm text-gray-600">
            ¿No tienes cuenta?{' '}
            <button 
              type="button"
              onClick={() => setCurrentView('register')}
              className="text-emerald-600 font-semibold hover:underline"
            >
              Regístrate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;