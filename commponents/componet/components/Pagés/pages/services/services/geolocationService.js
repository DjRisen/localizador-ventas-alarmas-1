// Servicio avanzado de geolocalización
class GeolocationService {
  constructor() {
    this.watchId = null;
    this.subscribers = [];
    this.currentPosition = null;
    this.accuracy = null;
    this.lastUpdate = null;
  }

  // Obtener ubicación actual una vez
  async getCurrentPosition(options = {}) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada'));
        return;
      }

      const defaultOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };
          this.lastUpdate = new Date();
          resolve(this.currentPosition);
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
          reject(error);
        },
        { ...defaultOptions, ...options }
      );
    });
  }

  // Iniciar seguimiento continuo
  startTracking(options = {}) {
    if (this.watchId) {
      console.warn('El seguimiento ya está activo');
      return;
    }

    if (!navigator.geolocation) {
      console.error('Geolocalización no soportada');
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        this.currentPosition = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading,
          timestamp: position.timestamp
        };
        this.lastUpdate = new Date();
        this.notifySubscribers();
      },
      (error) => {
        console.error('Error en seguimiento de ubicación:', error);
      },
      { ...defaultOptions, ...options }
    );
  }

  // Detener seguimiento
  stopTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // Suscribirse a actualizaciones
  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  // Notificar a suscriptores
  notifySubscribers() {
    this.subscribers.forEach(callback => {
      callback(this.currentPosition);
    });
  }

  // Calcular distancia entre dos puntos
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // Obtener dirección a partir de coordenadas (usando Nominatim)
  async reverseGeocode(lat, lng) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      
      if (!response.ok) {
        throw new Error('Error en reverse geocoding');
      }
      
      const data = await response.json();
      return {
        address: data.display_name,
        road: data.address?.road || '',
        town: data.address?.town || data.address?.city || '',
        postcode: data.address?.postcode || '',
        country: data.address?.country || ''
      };
    } catch (error) {
      console.error('Error en reverse geocoding:', error);
      return null;
    }
  }

  // Obtener coordenadas a partir de dirección
  async geocode(address) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      );
      
      if (!response.ok) {
        throw new Error('Error en geocoding');
      }
      
      const data = await response.json();
      if (data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name
        };
      }
      return null;
    } catch (error) {
      console.error('Error en geocoding:', error);
      return null;
    }
  }

  // Verificar si una ubicación está en un área específica
  isInArea(point, areaCenter, radiusKm) {
    const distance = this.calculateDistance(
      point.lat,
      point.lng,
      areaCenter.lat,
      areaCenter.lng
    );
    return distance <= radiusKm;
  }

  // Calcular ruta entre dos puntos
  async calculateRoute(start, end, mode = 'driving') {
    // Nota: Necesitarías una API como Google Maps o OSRM
    // Esta es una implementación simplificada
    const distance = this.calculateDistance(start.lat, start.lng, end.lat, end.lng);
    const estimatedTime = (distance / 50) * 60; // Asumiendo 50km/h promedio
    
    return {
      distance: distance.toFixed(2),
      duration: estimatedTime.toFixed(0),
      points: [
        { lat: start.lat, lng: start.lng },
        { lat: end.lat, lng: end.lng }
      ]
    };
  }

  // Obtener ubicación aproximada por IP
  async getLocationByIP() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      return {
        lat: data.latitude,
        lng: data.longitude,
        city: data.city,
        region: data.region,
        country: data.country_name,
        ip: data.ip
      };
    } catch (error) {
      console.error('Error obteniendo ubicación por IP:', error);
      return null;
    }
  }
}

export default new GeolocationService();
