// src/components/Main/MainMenu.js
import React from 'react';
import { Plus, ChefHat, Search, Clock, Star, LogOut } from 'lucide-react';

const MainMenu = ({ setCurrentView, onLogout }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header con botón de cerrar sesión */}
        <div className="flex justify-end mb-4">
          <button
            onClick={onLogout}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow hover:shadow-md transition text-gray-700 font-medium"
          >
            <LogOut size={18} />
            Cerrar Sesión
          </button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">¡Bienvenido!</h1>
          <p className="text-gray-600">¿Qué quieres hacer hoy?</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => setCurrentView('register-ingredient')} 
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition group"
          >
            <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-200 transition mx-auto">
              <Plus className="text-emerald-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Registrar Ingredientes</h3>
            <p className="text-gray-600 text-center">Añade nuevos alimentos a tu inventario</p>
          </button>
          
          <button 
            onClick={() => setCurrentView('generate-recipe')} 
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition group"
          >
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition mx-auto">
              <ChefHat className="text-blue-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Generar Recetas</h3>
            <p className="text-gray-600 text-center">Crea recetas con tus ingredientes</p>
          </button>
          
          <button 
            onClick={() => setCurrentView('inventory')} 
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition group"
          >
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-200 transition mx-auto">
              <Search className="text-purple-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Gestionar Inventario</h3>
            <p className="text-gray-600 text-center">Consulta y edita tus ingredientes</p>
          </button>
          
          <button 
            onClick={() => setCurrentView('pending-dishes')} 
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition group"
          >
            <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 group-hover:bg-orange-200 transition mx-auto">
              <Clock className="text-orange-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Platillos Almacenados</h3>
            <p className="text-gray-600 text-center">Revisa tus recetas sin terminar</p>
          </button>
          
          <button 
            onClick={() => setCurrentView('history')} 
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition group col-span-1 md:col-span-2"
          >
            <div className="bg-pink-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto group-hover:bg-pink-200 transition">
              <Star className="text-pink-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2 text-center">Historial de Recetas</h3>
            <p className="text-gray-600 text-center">Consulta todas tus recetas preparadas</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;