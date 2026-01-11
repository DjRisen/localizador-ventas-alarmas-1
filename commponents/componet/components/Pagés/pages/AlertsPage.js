import React from 'react';
import CrimeAlerts from '../components/CrimeAlerts';

const AlertsPage = () => {
  return (
    <div className="alerts-page">
      <h1 className="page-title">
        <i className="fas fa-bell"></i> Sistema de Alertas de Seguridad
      </h1>
      <p className="page-description">
        Recibe alertas en tiempo real sobre incidentes de seguridad cerca de tu ubicación. 
        Configura tus preferencias y mantente informado.
      </p>
      <CrimeAlerts />
    </div>
  );
};

export default AlertsPage;
