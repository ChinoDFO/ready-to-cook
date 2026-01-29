// src/components/Auth/Recovery.js
import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../services/firebase';


const Recovery = ({ setCurrentView }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRecovery = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    // Validar campo vacío
    if (!email) {
      setError('Por favor ingresa tu correo electrónico');
      setLoading(false);
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Formato de correo electrónico inválido');
      setLoading(false);
      return;
    }

    try {
      // Enviar email de recuperación
      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
      setEmail(''); // Limpiar el campo
    } catch (error) {
      console.error('Error al enviar email:', error);
      
      switch (error.code) {
        case 'auth/user-not-found':
          setError('No existe una cuenta con este correo electrónico');
          break;
        case 'auth/invalid-email':
          setError('Correo electrónico inválido');
          break;
        case 'auth/too-many-requests':
          setError('Demasiados intentos. Intenta más tarde');
          break;
        default:
          setError('Error al enviar el correo. Intenta nuevamente');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Recuperar Contraseña</h2>
        
        {!success ? (
          <form onSubmit={handleRecovery} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" 
                placeholder="tucorreo@ejemplo.com"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Te enviaremos un enlace para restablecer tu contraseña
              </p>
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
              {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
            </button>
            
            <button 
              type="button"
              onClick={() => setCurrentView('login')}
              className="w-full text-emerald-600 py-2 font-semibold hover:underline"
              disabled={loading}
            >
              Volver al inicio de sesión
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              <p className="font-semibold mb-2">✓ Correo enviado exitosamente</p>
              <p className="text-sm">
                Revisa tu bandeja de entrada y sigue las instrucciones para restablecer tu contraseña.
              </p>
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs flex gap-2">
                <span className="font-bold">!</span>
                <p>
                  <span className="font-semibold">Nota:</span> El correo de recuperación llegará siempre y cuando el correo proporcionado
                  pertenezca a una cuenta ya existente.
                </p>
              </div>
            </div>
            
            <button 
              onClick={() => setCurrentView('login')}
              className="w-full bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 transition"
            >
              Volver al inicio de sesión
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recovery;