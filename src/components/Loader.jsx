import './Loader.css';

export default function Loader({ visible }) {
  return (
    <div className={`loader ${visible ? '' : 'loader--done'}`} aria-hidden={!visible}>
      <div className="loader__bricks" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} style={{ animationDelay: `${i * 110}ms` }} />
        ))}
      </div>
      <p className="loader__text">Laying bricks and raising the gates</p>
    </div>
  );
}
