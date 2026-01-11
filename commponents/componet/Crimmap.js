import React, { useState, useEffect, useRef } from 'react';
import crimeDataService from '../services/crimeDataService';
import { cordobaTowns } from '../data/cordobaTowns';
import { crimeTypes } from '../data/crimeTypes';

const CrimeMap = () => {
  const [incidents, setIncidents] = useState([]);
  const [filteredIncidents, setFilteredIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTown, setSelectedTown] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [mapCenter, setMapCenter] = useState({ lat: 37.8882, lng: -4.7794 });
  const [zoom, setZoom] = useState(10);
  const [stats, setStats] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    loadCrimeData();
    const interval = setInterval(loadCrimeData, 300000); // Actualizar cada 5 minutos
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterIncidents();
    calculateStatistics();
  }, [incidents, selectedTown, selectedType, timeRange]);

  const loadCrimeData = async () => {
    setLoading(true);
    try {
      const data = await crimeDataService.getRealTimeCrimeData();
      setIncidents(data.incidents);
      console.log('Datos cargados:', data.incidents.length, 'incidentes');
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterIncidents = () => {
    let filtered = [...incidents];
    
    // Filtrar por pueblo
    if (selectedTown !== 'all') {
      filtered = filtered.filter(incident => incident.town === selectedTown);
    }
    
    // Filtrar por tipo
    if (selectedType !== 'all') {
      filtered = filtered.filter(incident => incident.type === selectedType);
    }
    
    // Filtrar por tiempo
    const now = new Date();
    filtered = filtered.filter(incident => {
      const incidentTime = new Date(incident.timestamp);
      const hoursDiff = (now - incidentTime) / (1000 * 60 * 60);
      
      switch(timeRange) {
        case '1h': return hoursDiff <= 1;
        case '6h': return hoursDiff <= 6;
        case '12h': return hoursDiff <= 12;
        case '24h': return hoursDiff <= 24;
        case '7d': return hoursDiff <= 168;
        default: return true;
      }
    });
    
    setFilteredIncidents(filtered);
    
    // Centrar mapa si hay selección de pueblo
    if (selectedTown !== 'all') {
      const town = cordobaTowns.find(t => t.name === selectedTown);
      if (town) {
        setMapCenter({ lat: town.lat, lng: town.lng });
        setZoom(12);
      }
    } else {
      setMapCenter({ lat: 37.8882, lng: -4.7794 });
      setZoom(10);
    }
  };

  const calculateStatistics = () => {
    if (incidents.length === 0) return;
    
    const stats = crimeDataService.getTownStatistics(filteredIncidents);
    setStats(stats);
  };

  const getCrimeIcon = (crimeType) => {
    const crime = crimeTypes.find(t => t.id === crimeType);
    return {
      icon: crime?.icon || 'fas fa-exclamation-triangle',
      color: crime?.color || '#6c757d'
    };
  };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'high': return '#dc3545';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) {
      return `Hace ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} h`;
    } else {
      return date.toLocaleDateString('es-ES');
    }
  };

  return (
    <div className="crime-map-container">
      {/* Panel de controles */}
      <div className="controls-panel card">
        <div className="controls-header">
          <h3>
            <i className="fas fa-filter"></i> Filtros de Búsqueda
          </h3>
          <button 
            className="btn btn-primary"
            onClick={loadCrimeData}
            disabled={loading}
          >
            <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i> Actualizar
          </button>
        </div>
        
        <div className="filters-grid">
          {/* Selector de pueblo */}
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-map-marker-alt"></i> Pueblo/Municipio
            </label>
            <select
              className="form-control"
              value={selectedTown}
              onChange={(e) => setSelectedTown(e.target.value)}
            >
              <option value="all">Todos los pueblos</option>
              {cordobaTowns.map(town => (
                <option key={town.id} value={town.name}>
                  {town.name} ({town.population?.toLocaleString()} hab)
                </option>
              ))}
            </select>
          </div>
          
          {/* Selector de tipo de robo */}
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-exclamation-circle"></i> Tipo de Delito
            </label>
            <select
              className="form-control"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="all">Todos los tipos</option>
              {crimeTypes.map(type => (
                <option key={type.id} value={type.id}>
                  <i className={type.icon}></i> {type.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Selector de tiempo */}
          <div className="form-group">
            <label className="form-label">
              <i className="fas fa-clock"></i> Período de Tiempo
            </label>
            <select
              className="form-control"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="1h">Última hora</option>
              <option value="6h">Últimas 6 horas</option>
              <option value="12h">Últimas 12 horas</option>
              <option value="24h">Últimas 24 horas</option>
              <option value="7d">Últimos 7 días</option>
              <option value="all">Todo el tiempo</option>
            </select>
          </div>
        </div>
        
        {/* Estadísticas rápidas */}
        <div className="quick-stats">
          <div className="stat-badge">
            <span className="stat-value">{filteredIncidents.length}</span>
            <span className="stat-label">Incidentes</span>
          </div>
          <div className="stat-badge">
            <span className="stat-value">
              {[...new Set(filteredIncidents.map(i => i.town))].length}
            </span>
            <span className="stat-label">Pueblos</span>
          </div>
          <div className="stat-badge">
            <span className="stat-value">
              {filteredIncidents.filter(i => i.status === 'activo').length}
            </span>
            <span className="stat-label">Activos</span>
          </div>
        </div>
      </div>

      {/* Mapa y lista de incidentes */}
      <div className="map-content">
        {/* Mapa (simulado con CSS - implementar con Leaflet/Google Maps en producción) */}
        <div className="card map-container">
          <div className="map-header">
            <h3>
              <i className="fas fa-map"></i> Mapa de Incidentes - Provincia de Córdoba
            </h3>
            <div className="map-legend">
              <div className="legend-item">
                <span className="legend-dot high"></span> Alta gravedad
              </div>
              <div className="legend-item">
                <span className="legend-dot medium"></span> Media gravedad
              </div>
              <div className="legend-item">
                <span className="legend-dot low"></span> Baja gravedad
              </div>
            </div>
          </div>
          
          <div className="map-placeholder" ref={mapRef}>
            {loading ? (
              <div className="map-loading">
                <i className="fas fa-spinner fa-spin fa-2x"></i>
                <p>Cargando mapa e incidentes...</p>
              </div>
            ) : (
              <>
                <div className="map-overlay">
                  {/* Puntos de incidentes */}
                  {filteredIncidents.map(incident => {
                    const town = cordobaTowns.find(t => t.name === incident.town);
                    if (!town) return null;
                    
                    // Posición aleatoria cerca del pueblo
                    const left = 50 + (Math.random() - 0.5) * 40;
                    const top = 50 + (Math.random() - 0.5) * 40;
                    
                    return (
                      <div
                        key={incident.id}
                        className="incident-marker"
                        style={{
                          left: `${left}%`,
                          top: `${top}%`,
                          backgroundColor: getSeverityColor(incident.severity),
                          borderColor: getSeverityColor(incident.severity)
                        }}
                        title={`${incident.description} - ${incident.town}`}
                      >
                        <i className={getCrimeIcon(incident.type).icon}></i>
                      </div>
                    );
                  })}
                  
                  {/* Marcadores de pueblos */}
                  {cordobaTowns.map(town => (
                    <div
                      key={town.id}
                      className="town-marker"
                      style={{
                        left: `${50 + (town.lng + 4.7794) * 20}%`,
                        top: `${50 - (town.lat - 37.8882) * 30}%`
                      }}
                      title={`${town.name} - ${town.population?.toLocaleString()} habitantes`}
                    >
                      <div className="town-dot"></div>
                      <div className="town-label">{town.name}</div>
                    </div>
                  ))}
                </div>
                
                <div className="map-info">
                  <p>
                    <i className="fas fa-info-circle"></i> 
                    Mapa interactivo de robos en la provincia de Córdoba. 
                    Cada marcador representa un incidente reportado.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Lista de incidentes */}
        <div className="card incidents-list">
          <h3>
            <i className="fas fa-list"></i> Incidentes Recientes ({filteredIncidents.length})
          </h3>
          
          {filteredIncidents.length === 0 ? (
            <div className="empty-incidents">
              <i className="fas fa-shield-alt fa-3x"></i>
              <p>No hay incidentes que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="incidents-container">
              {filteredIncidents.slice(0, 20).map(incident => {
                const crimeType = crimeTypes.find(t => t.id === incident.type);
                
                return (
                  <div 
                    key={incident.id} 
                    className={`incident-card ${incident.status}`}
                    style={{borderLeftColor: getSeverityColor(incident.severity)}}
                  >
                    <div className="incident-header">
                      <div className="incident-type">
                        <i className={crimeType?.icon || 'fas fa-exclamation-triangle'}></i>
                        <span>{crimeType?.name || incident.type}</span>
                      </div>
                      <div className="incident-meta">
                        <span className="time-ago">{formatTime(incident.timestamp)}</span>
                        <span 
                          className="severity-badge"
                          style={{backgroundColor: getSeverityColor(incident.severity)}}
                        >
                          {incident.severity}
                        </span>
                      </div>
                    </div>
                    
                    <div className="incident-body">
                      <h4>{incident.description}</h4>
                      <div className="incident-details">
                        <p>
                          <i className="fas fa-map-marker-alt"></i> 
                          <strong>Ubicación:</strong> {incident.location?.address || incident.town}
                        </p>
                        <p>
                          <i className="fas fa-city"></i> 
                          <strong>Pueblo:</strong> {incident.town}
                        </p>
                        {incident.details?.itemsStolen && (
                          <p>
                            <i className="fas fa-box-open"></i> 
                            <strong>Objetos robados:</strong> {incident.details.itemsStolen.join(', ')}
                          </p>
                        )}
                        {incident.details?.estimatedValue && (
                          <p>
                            <i className="fas fa-euro-sign"></i> 
                            <strong>Valor estimado:</strong> {incident.details.estimatedValue}€
                          </p>
                        )}
                        {incident.details?.policeReport && (
                          <p>
                            <i className="fas fa-file-alt"></i> 
                            <strong>Expediente policial:</strong> {incident.details.policeReport}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="incident-footer">
                      <div className="reported-by">
                        <i className="fas fa-user-shield"></i> Reportado por: {incident.reportedBy}
                      </div>
                      <div className={`status-badge ${incident.status}`}>
                        {incident.status === 'activo' ? '🔴 Activo' : '🟢 Resuelto'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Panel de estadísticas */}
      {stats && (
        <div className="card statistics-panel">
          <h3>
            <i className="fas fa-chart-bar"></i> Estadísticas por Pueblo
          </h3>
          <div className="stats-table">
            <table>
              <thead>
                <tr>
                  <th>Pueblo</th>
                  <th>Total</th>
                  <th>Últimas 24h</th>
                  <th>Tendencia</th>
                  <th>Tipo principal</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats)
                  .sort((a, b) => b[1].total - a[1].total)
                  .slice(0, 10)
                  .map(([townName, townStats]) => {
                    const mainType = Object.entries(townStats.types || {})
                      .sort((a, b) => b[1] - a[1])[0];
                    
                    return (
                      <tr key={townName}>
                        <td>
                          <i className="fas fa-map-pin"></i> {townName}
                        </td>
                        <td>
                          <span className="stat-number">{townStats.total}</span>
                        </td>
                        <td>
                          <span className="stat-number">{townStats.last24h}</span>
                        </td>
                        <td>
                          <span className={`trend ${townStats.trend}`}>
                            {townStats.trend === 'increasing' ? '↗️' : 
                             townStats.trend === 'decreasing' ? '↘️' : '➡️'}
                            {townStats.trend}
                          </span>
                        </td>
                        <td>
                          {mainType ? (
                            <span className="crime-type-tag">
                              {crimeTypes.find(t => t.id === mainType[0])?.name || mainType[0]}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style jsx>{`
        .crime-map-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        
        .controls-panel {
          margin-bottom: 1rem;
        }
        
        .controls-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        
        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }
        
        .quick-stats {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        
        .stat-badge {
          background-color: #f8f9fa;
          border-radius: var(--border-radius);
          padding: 1rem 1.5rem;
          text-align: center;
          min-width: 120px;
        }
        
        .stat-value {
          display: block;
          font-size: 2rem;
          font-weight: 700;
          color: var(--primary-color);
          line-height: 1;
        }
        
        .stat-label {
          display: block;
          color: #6c757d;
          font-size: 0.9rem;
          margin-top: 0.3rem;
        }
        
        .map-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }
        
        @media (max-width: 1200px) {
          .map-content {
            grid-template-columns: 1fr;
          }
        }
        
        .map-container {
          min-height: 600px;
        }
        
        .map-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        
        .map-legend {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: #6c757d;
        }
        
        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }
        
        .legend-dot.high {
          background-color: #dc3545;
        }
        
        .legend-dot.medium {
          background-color: #ffc107;
        }
        
        .legend-dot.low {
          background-color: #28a745;
        }
        
        .map-placeholder {
          position: relative;
          height: 500px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: var(--border-radius);
          overflow: hidden;
        }
        
        .map-loading {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          height: 100%;
          color: white;
          gap: 1rem;
        }
        
        .map-overlay {
          position: relative;
          width: 100%;
          height: 100%;
          background-image: 
            radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
        
        .incident-marker {
          position: absolute;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 3px solid;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          transform: translate(-50%, -50%);
          animation: pulse 2s infinite;
          z-index: 10;
        }
        
        .incident-marker:hover {
          transform: translate(-50%, -50%) scale(1.2);
          z-index: 100;
        }
        
        .town-marker {
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 5;
        }
        
        .town-dot {
          width: 8px;
          height: 8px;
          background-color: white;
          border: 2px solid #4a6fa5;
          border-radius: 50%;
          margin: 0 auto;
        }
        
        .town-label {
          position: absolute;
          top: 15px;
          left: 50%;
          transform: translateX(-50%);
          background-color: rgba(255,255,255,0.9);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.7rem;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.3s;
        }
        
        .town-marker:hover .town-label {
          opacity: 1;
        }
        
        .map-info {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background-color: rgba(0,0,0,0.7);
          color: white;
          padding: 1rem;
          font-size: 0.9rem;
        }
        
        .map-info i {
          margin-right: 0.5rem;
        }
        
        .incidents-list {
          max-height: 600px;
          overflow-y: auto;
        }
        
        .incidents-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 1rem;
        }
        
        .incident-card {
          background-color: white;
          border-radius: var(--border-radius);
          border-left: 4px solid;
          padding: 1.2rem;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
          transition: var(--transition);
        }
        
        .incident-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        
        .incident-card.activo {
          background-color: #fff8e1;
        }
        
        .incident-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        
        .incident-type {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: var(--dark-color);
        }
        
        .incident-type i {
          font-size: 1.2rem;
        }
        
        .incident-meta {
          display: flex;
          align-items: center;
          gap: 0.8rem;
        }
        
        .time-ago {
          font-size: 0.9rem;
          color: #6c757d;
        }
        
        .severity-badge {
          padding: 0.2rem 0.6rem;
          border-radius: 12px;
          color: white;
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
        }
        
        .incident-body h4 {
          color: var(--secondary-color);
          margin-bottom: 1rem;
        }
        
        .incident-details p {
          margin-bottom: 0.5rem;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.9rem;
        }
        
        .incident-details i {
          color: var(--primary-color);
          min-width: 20px;
          margin-top: 0.2rem;
        }
        
        .incident-details strong {
          min-width: 120px;
        }
        
        .incident-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #eee;
          font-size: 0.9rem;
        }
        
        .reported-by {
          color: #6c757d;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .status-badge {
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-weight: 500;
          font-size: 0.8rem;
        }
        
        .status-badge.activo {
          background-color: #ffebee;
          color: #c62828;
        }
        
        .status-badge.resuelto {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .empty-incidents {
          text-align: center;
          padding: 3rem 1rem;
          color: #6c757d;
        }
        
        .empty-incidents i {
          margin-bottom: 1rem;
          color: #dee2e6;
        }
        
        .statistics-panel {
          margin-top: 1rem;
        }
        
        .stats-table {
          overflow-x: auto;
          margin-top: 1rem;
        }
        
        .stats-table table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .stats-table th {
          background-color: #f8f9fa;
          padding: 1rem;
          text-align: left;
          color: var(--secondary-color);
          font-weight: 600;
          border-bottom: 2px solid #dee2e6;
        }
        
        .stats-table td {
          padding: 1rem;
          border-bottom: 1px solid #eee;
        }
        
        .stats-table tr:hover {
          background-color: #f8f9fa;
        }
        
        .stat-number {
          font-weight: 700;
          color: var(--primary-color);
        }
        
        .trend {
          padding: 0.3rem 0.6rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
        }
        
        .trend.increasing {
          background-color: #ffebee;
          color: #c62828;
        }
        
        .trend.decreasing {
          background-color: #e8f5e9;
          color: #2e7d32;
        }
        
        .trend.stable {
          background-color: #e3f2fd;
          color: #1565c0;
        }
        
        .crime-type-tag {
          background-color: #f0f2f5;
          padding: 0.3rem 0.6rem;
          border-radius: 12px;
          font-size: 0.8rem;
          color: #495057;
        }
        
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
        }
        
        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }
          
          .controls-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .map-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .incident-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.8rem;
          }
          
          .incident-footer {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
          
          .incident-details p {
            flex-direction: column;
            gap: 0.2rem;
          }
          
          .incident-details strong {
            min-width: auto;
          }
          
          .quick-stats {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default CrimeMap;
