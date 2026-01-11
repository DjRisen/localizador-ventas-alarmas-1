import React, { useState, useEffect } from 'react';
import crimeDataService from '../services/crimeDataService';
import { cordobaTowns } from '../data/cordobaTowns';

const CrimeAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [alertSettings, setAlertSettings] = useState({
    radius: 5, // km
    severity: ['high', 'medium'],
    crimeTypes: ['robo_casa', 'robo_negocio', 'robo_coche'],
    pushNotifications: true,
    emailAlerts: false
  });
  const [nearbyIncidents, setNearbyIncidents] = useState([]);

  useEffect(() => {
    // Solicitar ubicación del usuario
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
          // Usar ubicación por defecto (Córdoba capital)
          setUserLocation({ lat: 37.8882, lng: -4.7794 });
        }
      );
    }
  }, []);

  useEffect(() => {
    if (userLocation) {
      checkForNearbyCrimes();
    }
  }, [userLocation, alertSettings]);

  const checkForNearbyCrimes = async () => {
    const data = await crimeDataService.getRealTimeCrimeData();
    const incidents = data.incidents || [];
    
    // Filtrar incidentes cercanos
    const nearby = incidents.filter(incident => {
      if (!incident.location) return false;
      
      // Calcular distancia
      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        incident.location.lat,
        incident.location.lng
      );
      
      // Verificar filtros
      const matchesSeverity = alertSettings.severity.includes(incident.severity);
      const matchesType = alertSettings.crimeTypes.includes(incident.type);
      const isRecent = (Date.now() - new Date(incident.timestamp)) < 24 * 60 * 60 * 1000;
      
      return distance <= alertSettings.radius && matchesSeverity && matchesType && isRecent;
    });
    
    setNearbyIncidents(nearby);
    
    // Crear alertas para nuevos incidentes
    nearby.forEach(incident => {
      if (!alerts.find(a => a.incidentId === incident.id)) {
        const newAlert = {
          id: Date.now(),
          incidentId: incident.id,
          title: `⚠️ Incidente cercano en ${incident.town}`,
          message: `${incident.description} - A ${calculateDistance(
            userLocation.lat,
            userLocation.lng,
            incident.location.lat,
            incident.location.lng
          ).toFixed(1)} km de tu ubicación`,
          timestamp: new Date().toISOString(),
          severity: incident.severity,
          read: false
        };
        
        setAlerts(prev => [newAlert, ...prev]);
        
        // Mostrar notificación push
        if (alertSettings.pushNotifications && Notification.permission === 'granted') {
          new Notification(newAlert.title, {
            body: newAlert.message,
            icon: '/alert-icon.png'
          });
        }
      }
    });
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          alert('Notificaciones activadas. Recibirás alertas de incidentes cercanos.');
        }
      });
    }
  };

  const markAsRead = (alertId) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, read: true } : alert
    ));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const updateAlertSettings = (key, value) => {
    setAlertSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="crime-alerts-container">
      {/* Configuración de alertas */}
      <div className="card alert-settings">
        <h3>
          <i className="fas fa-cog"></i> Configuración de Alertas
        </h3>
        
        <div className="settings-grid">
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-ruler"></i> Radio de alerta (km)
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={alertSettings.radius}
              onChange={(e) => updateAlertSettings('radius', parseInt(e.target.value))}
              className="form-control"
            />
            <div className="range-value">{alertSettings.radius} km</div>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-exclamation-triangle"></i> Gravedad mínima
            </label>
            <div className="checkbox-group">
              {['high', 'medium', 'low'].map(severity => (
                <label key={severity} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={alertSettings.severity.includes(severity)}
                    onChange={(e) => {
                      const newSeverity = e.target.checked
                        ? [...alertSettings.severity, severity]
                        : alertSettings.severity.filter(s => s !== severity);
                      updateAlertSettings('severity', newSeverity);
                    }}
                  />
                  <span className={`severity-dot ${severity}`}></span>
                  {severity === 'high' ? 'Alta' : severity === 'medium' ? 'Media' : 'Baja'}
                </label>
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-shield-alt"></i> Tipos de delitos
            </label>
            <select
              multiple
              className="form-control"
              value={alertSettings.crimeTypes}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                updateAlertSettings('crimeTypes', selected);
              }}
              style={{height: '120px'}}
            >
              <option value="robo_casa">Robo en vivienda</option>
              <option value="robo_negocio">Robo en negocio</option>
              <option value="robo_coche">Robo de vehículo</option>
              <option value="robo_calle">Robo en vía pública</option>
              <option value="hurto">Hurto</option>
              <option value="vandalismo">Vandalismo</option>
            </select>
          </div>
        </div>
        
        <div className="notification-settings">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={alertSettings.pushNotifications}
              onChange={(e) => updateAlertSettings('pushNotifications', e.target.checked)}
            />
            <i className="fas fa-bell"></i> Notificaciones push
          </label>
          
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={alertSettings.emailAlerts}
              onChange={(e) => updateAlertSettings('emailAlerts', e.target.checked)}
            />
            <i className="fas fa-envelope"></i> Alertas por email
          </label>
          
          <button
            className="btn btn-primary"
            onClick={requestNotificationPermission}
          >
            <i className="fas fa-check-circle"></i> Activar notificaciones
          </button>
        </div>
        
        {userLocation && (
          <div className="location-info">
            <p>
              <i className="fas fa-map-pin"></i> 
              Tu ubicación: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </p>
            <p>
              <i className="fas fa-exclamation-circle"></i>
              {nearbyIncidents.length} incidentes cercanos en los últimos 24h
            </p>
          </div>
        )}
      </div>

      {/* Lista de alertas */}
      <div className="card alerts-list">
        <div className="alerts-header">
          <h3>
            <i className="fas fa-bell"></i> Alertas ({alerts.filter(a => !a.read).length} nuevas)
          </h3>
          {alerts.length > 0 && (
            <button
              className="btn btn-secondary"
              onClick={clearAllAlerts}
            >
              <i className="fas fa-trash"></i> Limpiar todo
            </button>
          )}
        </div>
        
        {alerts.length === 0 ? (
          <div className="empty-alerts">
            <i className="fas fa-bell-slash fa-3x"></i>
            <p>No hay alertas en este momento</p>
            <p className="small-text">
              Recibirás alertas cuando ocurran incidentes cerca de tu ubicación
            </p>
          </div>
        ) : (
          <div className="alerts-container">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`alert-item ${alert.severity} ${alert.read ? 'read' : 'unread'}`}
                onClick={() => markAsRead(alert.id)}
              >
                <div className="alert-icon">
                  <i className="fas fa-exclamation-triangle"></i>
                </div>
                <div className="alert-content">
                  <h4>{alert.title}</h4>
                  <p>{alert.message}</p>
                  <div className="alert-time">
                    <i className="fas fa-clock"></i>
                    {new Date(alert.timestamp).toLocaleTimeString('es-ES')}
                  </div>
                </div>
                {!alert.read && (
                  <div className="alert-badge">
                    <span className="badge-dot"></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incidentes cercanos */}
      {nearbyIncidents.length > 0 && (
        <div className="card nearby-incidents">
          <h3>
            <i className="fas fa-map-marker-alt"></i> Incidentes Cercanos
          </h3>
          <div className="incidents-grid">
            {nearbyIncidents.map(incident => {
              const distance = calculateDistance(
                userLocation.lat,
                userLocation.lng,
                incident.location.lat,
                incident.location.lng
              );
              
              return (
                <div key={incident.id} className="nearby-incident">
                  <div className="incident-distance">
                    <span className="distance-value">{distance.toFixed(1)}</span>
                    <span className="distance-unit">km</span>
                  </div>
                  <div className="incident-details">
                    <h4>{incident.town}</h4>
                    <p>{incident.description}</p>
                    <div className="incident-meta">
                      <span className="time-ago">
                        {new Date(incident.timestamp).toLocaleTimeString('es-ES')}
                      </span>
                      <span className={`severity ${incident.severity}`}>
                        {incident.severity}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Consejos de seguridad */}
      <div className="card safety-tips">
        <h3>
          <i className="fas fa-lightbulb"></i> Consejos de Seguridad
        </h3>
        <div className="tips-grid">
          <div className="tip-item">
            <i className="fas fa-home"></i>
            <h4>En casa</h4>
            <ul>
              <li>Cierra con llave puertas y ventanas</li>
              <li>No dejes llaves en lugares visibles</li>
              <li>Instala sistema de alarma</li>
            </ul>
          </div>
          
          <div className="tip-item">
            <i className="fas fa-car"></i>
            <h4>En el coche</h4>
            <ul>
              <li>No dejes objetos a la vista</li>
              <li>Estaciona en zonas iluminadas</li>
              <li>Usa dispositivos antirrobo</li>
            </ul>
          </div>
          
          <div className="tip-item">
            <i className="fas fa-walking"></i>
            <h4>En la calle</h4>
            <ul>
              <li>Evita zonas oscuras y solitarias</li>
              <li>Ten el teléfono accesible</li>
              <li>Mantén distancia de extraños</li>
            </ul>
          </div>
          
          <div className="tip-item">
            <i className="fas fa-phone-alt"></i>
            <h4>Teléfonos de emergencia</h4>
            <ul>
              <li><strong>091</strong> - Policía Nacional</li>
              <li><strong>062</strong> - Guardia Civil</li>
              <li><strong>112</strong> - Emergencias</li>
            </ul>
          </div>
        </div>
      </div>

      <style jsx>{`
        .crime-alerts-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .alert-settings {
          margin-bottom: 1rem;
        }
        
        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin: 1.5rem 0;
        }
        
        .range-value {
          text-align: center;
          font-weight: 600;
          color: var(--primary-color);
          margin-top: 0.5rem;
        }
        
        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }
        
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          cursor: pointer;
          font-weight: 500;
        }
        
        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
        }
        
        .severity-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          display: inline-block;
        }
        
        .severity-dot.high {
          background-color: #dc3545;
        }
        
        .severity-dot.medium {
          background-color: #ffc107;
        }
        
        .severity-dot.low {
          background-color: #28a745;
        }
        
        .notification-settings {
          display: flex;
          flex-wrap: wrap;
          gap: 1.5rem;
          margin: 1.5rem 0;
          padding: 1rem;
          background-color: #f8f9fa;
          border-radius: var(--border-radius);
        }
        
        .location-info {
          background-color: #e3f2fd;
          padding: 1rem;
          border-radius: var(--border-radius);
          margin-top: 1rem;
        }
        
        .location-info p {
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .alerts-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .alerts-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        
        .alert-item {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          background-color: white;
          border-radius: var(--border-radius);
          border-left: 4px solid;
          cursor: pointer;
          transition: var(--transition);
        }
        
        .alert-item:hover {
          background-color: #f8f9fa;
        }
        
        .alert-item.unread {
          background-color: #fff8e1;
        }
        
        .alert-item.high {
          border-left-color: #dc3545;
        }
        
        .alert-item.medium {
          border-left-color: #ffc107;
        }
        
        .alert-item.low {
          border-left-color: #28a745;
        }
        
        .alert-icon {
          color: #ffc107;
          font-size: 1.5rem;
          margin-top: 0.2rem;
        }
        
        .alert-content {
          flex: 1;
        }
        
        .alert-content h4 {
          color: var(--dark-color);
          margin-bottom: 0.5rem;
        }
        
        .alert-content p {
          color: #6c757d;
          margin-bottom: 0.5rem;
        }
        
        .alert-time {
          font-size: 0.8rem;
          color: #adb5bd;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }
        
        .alert-badge {
          display: flex;
          align-items: center;
        }
        
        .badge-dot {
          width: 10px;
          height: 10px;
          background-color: #dc3545;
          border-radius: 50%;
        }
        
        .empty-alerts {
          text-align: center;
          padding: 3rem 1rem;
          color: #6c757d;
        }
        
        .empty-alerts i {
          margin-bottom: 1rem;
          color: #dee2e6;
        }
        
        .small-text {
          font-size: 0.9rem;
          margin-top: 0.5rem;
        }
        
        .nearby-incidents {
          margin-top: 1rem;
        }
        
        .incidents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
          margin-top: 1rem;
        }
        
        .nearby-incident {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background-color: #f8f9fa;
          border-radius: var(--border-radius);
          border: 1px solid #dee2e6;
        }
        
        .incident-distance {
          text-align: center;
          min-width: 60px;
        }
        
        .distance-value {
          display: block;
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--primary-color);
          line-height: 1;
        }
        
        .distance-unit {
          font-size: 0.8rem;
          color: #6c757d;
        }
        
        .incident-details {
          flex: 1;
        }
        
        .incident-details h4 {
          color: var(--secondary-color);
          margin-bottom: 0.3rem;
        }
        
        .incident-details p {
          font-size: 0.9rem;
          color: #495057;
          margin-bottom: 0.5rem;
        }
        
        .incident-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #6c757d;
        }
        
        .severity {
          padding: 0.2rem 0.5rem;
          border-radius: 12px;
          font-weight: 500;
          text-transform: uppercase;
        }
        
        .severity.high {
          background-color: #ffebee;
          color: #c62828;
        }
        
        .severity.medium {
          background-color: #fff8e1;
          color: #ff8f00;
        }
        
        .severity.low {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .safety-tips {
          margin-top: 1rem;
        }
        
        .tips-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-top: 1.5rem;
        }
        
        .tip-item {
          background-color: white;
          padding: 1.5rem;
          border-radius: var(--border-radius);
          border: 1px solid #eaeaea;
        }
        
        .tip-item i {
          font-size: 2rem;
          color: var(--primary-color);
          margin-bottom: 1rem;
        }
        
        .tip-item h4 {
          color: var(--secondary-color);
          margin-bottom: 1rem;
        }
        
        .tip-item ul {
          list-style-type: none;
          padding: 0;
        }
        
        .tip-item li {
          margin-bottom: 0.5rem;
          padding-left: 1.5rem;
          position: relative;
        }
        
        .tip-item li:before {
          content: '✓';
          position: absolute;
          left: 0;
          color: #4fc3a1;
          font-weight: bold;
        }
        
        @media (max-width: 768px) {
          .settings-grid {
            grid-template-columns: 1fr;
          }
          
          .notification-settings {
            flex-direction: column;
            gap: 1rem;
          }
          
          .alerts-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .incidents-grid {
            grid-template-columns: 1fr;
          }
          
          .tips-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default CrimeAlerts;
