import React from 'react';
import CrimeMap from '../components/CrimeMap';

const CrimeMapPage = () => {
  return (
    <div className="crime-map-page">
      <h1 className="page-title">
        <i className="fas fa-map-marked-alt"></i> Mapa de Robos en Tiempo Real
      </h1>
      <p className="page-description">
        Mapa interactivo de robos e incidentes en la provincia de Córdoba. 
        Datos actualizados en tiempo real de fuentes oficiales y reportes ciudadanos.
      </p>
      
      <div className="info-cards">
        <div className="info-card">
          <i className="fas fa-database"></i>
          <h3>Fuentes de Datos</h3>
          <p>Ministerio del Interior, Junta de Andalucía, Policía Nacional, medios locales</p>
        </div>
        
        <div className="info-card">
          <i className="fas fa-sync-alt"></i>
          <h3>Actualización</h3>
          <p>Datos actualizados cada 5 minutos. Más de 80 pueblos monitorizados</p>
        </div>
        
        <div className="info-card">
          <i className="fas fa-exclamation-triangle"></i>
          <h3>Alertas</h3>
          <p>Sistema de alertas en tiempo real para incidentes cercanos</p>
        </div>
      </div>
      
      <CrimeMap />
    </div>
  );
};

export default CrimeMapPage;
