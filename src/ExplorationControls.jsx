import React from 'react';
import { 
  Compass, 
  Footprints, 
  Car, 
  Film, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  X, 
  ChevronUp, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Bell,
  Sparkles,
  ArrowRight,
  Eye,
  Gauge,
  Navigation,
  Flame
} from 'lucide-react';

export default function ExplorationControls({
  mode,
  onModeChange,
  walkSpot,
  onWalkSpotChange,
  onWalkMove,
  tukData,
  onNextTukTuk,
  onTukPerspectiveChange,
  onTukDriveModeChange,
  onTukMove,
  onHonkHorn,
  tourData,
  onTourAction,
}) {
  return (
    <div className="exploration-container">
      {/* 1. Mode Switcher Tabs (Top Center / Above Dock) */}
      <div className="mode-switcher-dock" role="tablist" aria-label="Exploration Modes">
        <button
          className={`mode-tab ${mode === 'orbit' ? 'is-active' : ''}`}
          role="tab"
          aria-selected={mode === 'orbit'}
          onClick={() => onModeChange('orbit')}
          title="Overview orbit mode"
        >
          <Compass className="tab-icon" />
          <span>City Map</span>
        </button>

        <button
          className={`mode-tab ${mode === 'walk' ? 'is-active' : ''}`}
          role="tab"
          aria-selected={mode === 'walk'}
          onClick={() => onModeChange('walk')}
          title="First-person walk mode along promenades"
        >
          <Footprints className="tab-icon" />
          <span>Walk Mode</span>
        </button>

        <button
          className={`mode-tab ${mode === 'tuktuk' ? 'is-active' : ''}`}
          role="tab"
          aria-selected={mode === 'tuktuk'}
          onClick={() => onModeChange('tuktuk')}
          title="Tuk-Tuk dashcam ride-along"
        >
          <Car className="tab-icon" />
          <span>Tuk-Tuk Ride</span>
        </button>

        <button
          className={`mode-tab ${mode === 'tour' ? 'is-active' : ''}`}
          role="tab"
          aria-selected={mode === 'tour'}
          onClick={() => onModeChange('tour')}
          title="Cinematic aerial flythrough tour"
        >
          <Film className="tab-icon" />
          <span>Grand Tour</span>
        </button>
      </div>

      {/* 2. Walk Mode HUD Overlay */}
      {mode === 'walk' && (
        <div className="walk-hud glass-panel">
          <div className="hud-header">
            <div className="hud-title">
              <Footprints className="hud-icon" />
              <div>
                <strong>Street & Promenade Walk</strong>
                <small>WASD or Arrow Keys · Drag screen to look around</small>
              </div>
            </div>
            <button className="hud-close" onClick={() => onModeChange('orbit')} aria-label="Exit Walk Mode">
              <X />
            </button>
          </div>

          <div className="walk-spots">
            {[
              { id: 'galle_face', label: 'Galle Face Promenade', desc: 'Oceanfront surf walk' },
              { id: 'beira_lake', label: 'Beira Waterfront', desc: 'Seema Malaka pavilion' },
              { id: 'lotus_plaza', label: 'Lotus Plaza', desc: 'Tower blossom vista' },
            ].map(spot => (
              <button
                key={spot.id}
                className={`walk-spot-btn ${walkSpot === spot.id ? 'is-active' : ''}`}
                onClick={() => onWalkSpotChange(spot.id)}
              >
                <span>{spot.label}</span>
                <small>{spot.desc}</small>
              </button>
            ))}
          </div>

          {/* On-screen touch D-Pad for mobile / quick navigation */}
          <div className="touch-dpad">
            <button
              className="dpad-btn up"
              onPointerDown={() => onWalkMove?.({ forward: true })}
              onPointerUp={() => onWalkMove?.({ forward: false })}
              onPointerLeave={() => onWalkMove?.({ forward: false })}
              aria-label="Walk Forward"
            >
              <ChevronUp />
            </button>
            <div className="dpad-row">
              <button
                className="dpad-btn left"
                onPointerDown={() => onWalkMove?.({ left: true })}
                onPointerUp={() => onWalkMove?.({ left: false })}
                onPointerLeave={() => onWalkMove?.({ left: false })}
                aria-label="Strafe Left"
              >
                <ChevronLeft />
              </button>
              <button
                className="dpad-btn down"
                onPointerDown={() => onWalkMove?.({ backward: true })}
                onPointerUp={() => onWalkMove?.({ backward: false })}
                onPointerLeave={() => onWalkMove?.({ backward: false })}
                aria-label="Walk Backward"
              >
                <ChevronDown />
              </button>
              <button
                className="dpad-btn right"
                onPointerDown={() => onWalkMove?.({ right: true })}
                onPointerUp={() => onWalkMove?.({ right: false })}
                onPointerLeave={() => onWalkMove?.({ right: false })}
                aria-label="Strafe Right"
              >
                <ChevronRight />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Tuk-Tuk Simulator HUD */}
      {mode === 'tuktuk' && (
        <div className="tuktuk-hud glass-panel">
          <div className="hud-header">
            <div className="hud-title">
              <div className="tuk-avatar">🛺</div>
              <div>
                <strong>Bajaj RE Tuk-Tuk · Colombo</strong>
                <small>WP - AB 7724 · {tukData?.driveMode === 'cruise' ? `Traffic Vehicle #${String((tukData?.tukIndex ?? 0) + 1).padStart(2, '0')}` : 'Manual Driving Mode'}</small>
              </div>
            </div>
            <button className="hud-close" onClick={() => onModeChange('orbit')} aria-label="Exit Tuk-Tuk View">
              <X />
            </button>
          </div>

          {/* Drive Mode & Camera Perspective Switchers */}
          <div className="tuktuk-toolbar">
            <div className="toolbar-group">
              <span className="toolbar-label">MODE</span>
              <div className="btn-segmented">
                <button
                  className={`segment-btn ${(tukData?.driveMode || 'manual') === 'manual' ? 'is-active' : ''}`}
                  onClick={() => onTukDriveModeChange?.('manual')}
                >
                  <Gauge className="segment-icon" />
                  <span>Manual</span>
                </button>
                <button
                  className={`segment-btn ${tukData?.driveMode === 'cruise' ? 'is-active' : ''}`}
                  onClick={() => onTukDriveModeChange?.('cruise')}
                >
                  <Navigation className="segment-icon" />
                  <span>Cruise</span>
                </button>
              </div>
            </div>

            <div className="toolbar-group">
              <span className="toolbar-label">VIEW</span>
              <div className="btn-segmented">
                <button
                  className={`segment-btn ${(tukData?.perspective || 'chase') === 'cockpit' ? 'is-active' : ''}`}
                  onClick={() => onTukPerspectiveChange?.('cockpit')}
                  title="First-person handlebar driver view"
                >
                  <Eye className="segment-icon" />
                  <span>Cockpit</span>
                </button>
                <button
                  className={`segment-btn ${(tukData?.perspective || 'chase') === 'passenger' ? 'is-active' : ''}`}
                  onClick={() => onTukPerspectiveChange?.('passenger')}
                  title="Rear passenger seat view"
                >
                  <Footprints className="segment-icon" />
                  <span>Passenger</span>
                </button>
                <button
                  className={`segment-btn ${(tukData?.perspective || 'chase') === 'chase' ? 'is-active' : ''}`}
                  onClick={() => onTukPerspectiveChange?.('chase')}
                  title="Third-person chase camera"
                >
                  <Car className="segment-icon" />
                  <span>Chase</span>
                </button>
              </div>
            </div>
          </div>

          {/* Colombo Taxi Meter + Speedometer Display */}
          <div className="tuktuk-telemetry-row">
            {/* Real Sri Lankan Taxi Fare Meter */}
            <div className="taxi-fare-meter">
              <div className="meter-header">
                <span className="meter-pulse" />
                <span className="meter-brand">COLOMBO TAXI METER</span>
                <span className="meter-status">HIRED</span>
              </div>
              <div className="meter-display">
                <div className="meter-amount">
                  <span className="meter-currency">LKR</span>
                  <span className="meter-digits">{Math.round(tukData?.fareLKR || 100)}</span>
                </div>
                <div className="meter-meta">
                  <div className="meta-item">
                    <span className="meta-label">DISTANCE</span>
                    <span className="meta-val">{Number(tukData?.distanceKm || 0).toFixed(2)} KM</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">RATE</span>
                    <span className="meta-val">80/KM</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Speedometer Gauge */}
            <div className="speedometer-box">
              <div className="speed-top">
                <span className="gear-badge">
                  {(tukData?.speedKmH || 0) > 1 ? 'D' : (tukData?.speedKmH || 0) < -0.5 ? 'R' : 'N'}
                </span>
                <span className="speed-label">SPEED</span>
              </div>
              <div className="speed-main">
                <span className="speed-val">{Math.round(tukData?.speedKmH || 0)}</span>
                <span className="speed-unit">KM/H</span>
              </div>
            </div>
          </div>

          {/* Action Row */}
          <div className="tuktuk-actions">
            <button className="action-btn horn-btn" onClick={onHonkHorn} title="Honk Colombo Tuk-Tuk dual-tone horn (Key: H)">
              <Bell className="btn-icon" />
              <span>Honk Horn (H)</span>
            </button>
            {tukData?.driveMode === 'cruise' && (
              <button className="action-btn switch-btn" onClick={onNextTukTuk} title="Switch to another tuk-tuk in traffic">
                <ArrowRight className="btn-icon" />
                <span>Next Vehicle</span>
              </button>
            )}
          </div>

          {/* Touch Pedals for Mobile / Pointer in Manual Drive */}
          {tukData?.driveMode !== 'cruise' && (
            <div className="touch-pedals-cluster">
              <div className="pedal-group steering-pedals">
                <button
                  className="pedal-btn steer-btn"
                  onPointerDown={() => onTukMove?.({ left: true })}
                  onPointerUp={() => onTukMove?.({ left: false })}
                  onPointerLeave={() => onTukMove?.({ left: false })}
                  aria-label="Steer Left"
                >
                  <ChevronLeft />
                  <span>LEFT</span>
                </button>
                <button
                  className="pedal-btn steer-btn"
                  onPointerDown={() => onTukMove?.({ right: true })}
                  onPointerUp={() => onTukMove?.({ right: false })}
                  onPointerLeave={() => onTukMove?.({ right: false })}
                  aria-label="Steer Right"
                >
                  <ChevronRight />
                  <span>RIGHT</span>
                </button>
              </div>

              <div className="pedal-group throttle-pedals">
                <button
                  className="pedal-btn drift-btn"
                  onPointerDown={() => onTukMove?.({ handbrake: true })}
                  onPointerUp={() => onTukMove?.({ handbrake: false })}
                  onPointerLeave={() => onTukMove?.({ handbrake: false })}
                  aria-label="Handbrake Drift"
                >
                  <Flame className="pedal-icon" />
                  <span>DRIFT</span>
                </button>
                <button
                  className="pedal-btn brake-btn"
                  onPointerDown={() => onTukMove?.({ backward: true })}
                  onPointerUp={() => onTukMove?.({ backward: false })}
                  onPointerLeave={() => onTukMove?.({ backward: false })}
                  aria-label="Brake or Reverse"
                >
                  <ChevronDown />
                  <span>BRAKE</span>
                </button>
                <button
                  className="pedal-btn accel-btn"
                  onPointerDown={() => onTukMove?.({ forward: true })}
                  onPointerUp={() => onTukMove?.({ forward: false })}
                  onPointerLeave={() => onTukMove?.({ forward: false })}
                  aria-label="Accelerate"
                >
                  <ChevronUp />
                  <span>GAS</span>
                </button>
              </div>
            </div>
          )}

          <div className="tuktuk-keyboard-hint">
            <span>WASD / Arrows to Drive · Space for Handbrake · H to Honk · C for Camera</span>
          </div>
        </div>
      )}

      {/* 4. Cinematic Tour HUD Banner */}
      {mode === 'tour' && tourData?.waypoint && (
        <div className="tour-hud glass-panel">
          <div className="tour-card-header">
            <div className="tour-badge">
              <Sparkles className="badge-icon" />
              <span>COLOMBO GRAND TOUR</span>
            </div>
            <button className="hud-close" onClick={() => onModeChange('orbit')} aria-label="Exit Grand Tour">
              <X />
            </button>
          </div>

          <div className="tour-content">
            <h3>{tourData.waypoint.title}</h3>
            <p className="sinhala-sub" lang="si">{tourData.waypoint.sinhala}</p>
            <p className="tour-desc">{tourData.waypoint.description}</p>
          </div>

          {/* Progress bar */}
          <div className="tour-progress-bar">
            <div className="tour-progress-fill" style={{ width: `${Math.round((tourData.progress || 0) * 100)}%` }} />
          </div>

          <div className="tour-controls">
            <button className="tour-ctrl-btn" onClick={() => onTourAction('prev')} aria-label="Previous Landmark">
              <SkipBack />
            </button>
            <button className="tour-ctrl-btn play-pause" onClick={() => onTourAction('pause')} aria-label={tourData.isPaused ? 'Resume Tour' : 'Pause Tour'}>
              {tourData.isPaused ? <Play /> : <Pause />}
            </button>
            <button className="tour-ctrl-btn" onClick={() => onTourAction('next')} aria-label="Next Landmark">
              <SkipForward />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
