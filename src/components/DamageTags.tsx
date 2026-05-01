'use client';

const DAMAGE_TAGS = [
  { key: 'Front hit', icon: '🚗' },
  { key: 'Rear hit', icon: '🔧' },
  { key: 'Left side', icon: '◀' },
  { key: 'Right side', icon: '▶' },
  { key: 'Suspension', icon: '🔩' },
  { key: 'Engine', icon: '⚙' },
  { key: 'Cooling', icon: '💧' },
  { key: 'Electrical', icon: '⚡' },
  { key: 'Flood', icon: '🌊' },
  { key: 'Interior', icon: '🪑' },
  { key: 'Airbag', icon: '💨' },
  { key: 'Frame/structure', icon: '🏗' },
];

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
}

export default function DamageTags({ value, onChange }: Props) {
  function toggle(tag: string) {
    if (value.includes(tag)) {
      onChange(value.filter(t => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  }

  return (
    <div className="card">
      <div className="card-title">Damage areas — select all that apply</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {DAMAGE_TAGS.map(tag => (
          <button
            key={tag.key}
            onClick={() => toggle(tag.key)}
            className={`dmg-btn${value.includes(tag.key) ? ' on' : ''}`}
          >
            <div style={{ fontSize: 18, marginBottom: 4 }}>{tag.icon}</div>
            <div style={{ fontSize: 12 }}>{tag.key}</div>
          </button>
        ))}
      </div>
      {value.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {value.map(tag => (
            <span key={tag} className="badge badge-amber">{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}
