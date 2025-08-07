import React, { useState, useRef } from 'react';
import { MapContainer, TileLayer, Rectangle, useMapEvents } from 'react-leaflet';
import { LatLngBounds, LatLngTuple } from 'leaflet';

type AreaModalProps = {
  bounds: LatLngBounds | null;
  onClose: () => void;
};

const AreaModal: React.FC<AreaModalProps> = ({ bounds, onClose }) => {
  if (!bounds) return null;
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  };

  const modalContentStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
  };

  return (
    <div style={modalStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
        <h2>Координаты выделенной области</h2>
        <p>
          <b>Юго-запад:</b> {sw.lat.toFixed(6)}, {sw.lng.toFixed(6)}<br />
          <b>Северо-восток:</b> {ne.lat.toFixed(6)}, {ne.lng.toFixed(6)}
        </p>
        <button onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );
};

const AreaSelector: React.FC<{
  onAreaSelected: (bounds: LatLngBounds) => void;
  selectedBounds: LatLngBounds | null;
  setSelectedBounds: (b: LatLngBounds | null) => void;
}> = ({ onAreaSelected, selectedBounds, setSelectedBounds }) => {
  const [firstPoint, setFirstPoint] = useState<LatLngTuple | null>(null);
  const [secondPoint, setSecondPoint] = useState<LatLngTuple | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mouse: LatLngTuple; bounds: LatLngBounds } | null>(null);

  useMapEvents({
    click(e) {
      if (selectedBounds) return;
      if (!firstPoint) {
        setFirstPoint([e.latlng.lat, e.latlng.lng]);
        setSecondPoint([e.latlng.lat, e.latlng.lng]);
      } else {
        setSecondPoint([e.latlng.lat, e.latlng.lng]);
        const bounds = new LatLngBounds(firstPoint, [e.latlng.lat, e.latlng.lng]);
        setSelectedBounds(bounds);
        onAreaSelected(bounds);
        setFirstPoint(null);
        setSecondPoint(null);
      }
    },
    mousemove(e) {
      if (firstPoint && !selectedBounds) {
        setSecondPoint([e.latlng.lat, e.latlng.lng]);
      }
      if (dragging && dragStart.current && selectedBounds) {
        const [startLat, startLng] = dragStart.current.mouse;
        const dLat = e.latlng.lat - startLat;
        const dLng = e.latlng.lng - startLng;
        const oldBounds = dragStart.current.bounds;
        const sw = oldBounds.getSouthWest();
        const ne = oldBounds.getNorthEast();
        const newSw: LatLngTuple = [sw.lat + dLat, sw.lng + dLng];
        const newNe: LatLngTuple = [ne.lat + dLat, ne.lng + dLng];
        const newBounds = new LatLngBounds(newSw, newNe);
        setSelectedBounds(newBounds);
        dragStart.current = {
          mouse: [e.latlng.lat, e.latlng.lng],
          bounds: newBounds,
        };
      }
    },
    mousedown(e) {
      if (selectedBounds) {
        const bounds = selectedBounds;
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        if (
          lat >= sw.lat && lat <= ne.lat &&
          lng >= sw.lng && lng <= ne.lng
        ) {
          setDragging(true);
          dragStart.current = {
            mouse: [lat, lng],
            bounds: bounds,
          };
        }
      }
    },
    mouseup() {
      setDragging(false);
      dragStart.current = null;
    },
  });

  let previewBounds: LatLngBounds | null = null;
  if (firstPoint && secondPoint) {
    previewBounds = new LatLngBounds(firstPoint, secondPoint);
  }

  return (
    <>
      {previewBounds && !selectedBounds && (
        <Rectangle
          bounds={previewBounds}
          pathOptions={{ color: 'blue', dashArray: '4' }}
        />
      )}
      {selectedBounds && (
        <Rectangle
          bounds={[
            [selectedBounds.getSouthWest().lat, selectedBounds.getSouthWest().lng],
            [selectedBounds.getNorthEast().lat, selectedBounds.getNorthEast().lng],
          ]}
          pathOptions={{ color: 'red' }}
        />
      )}
    </>
  );
};

const MapWithArea: React.FC = () => {
  const [selectedBounds, setSelectedBounds] = useState<LatLngBounds | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleAreaSelected = (bounds: LatLngBounds) => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedBounds(null);
  };

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <MapContainer center={[55.751244, 37.618423]} zoom={10} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <AreaSelector
          onAreaSelected={handleAreaSelected}
          selectedBounds={selectedBounds}
          setSelectedBounds={setSelectedBounds}
        />
      </MapContainer>
      {showModal && (
        <AreaModal bounds={selectedBounds} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default MapWithArea;
