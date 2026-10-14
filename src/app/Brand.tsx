import { Link } from 'react-router-dom';

export function Brand({ className = '' }: { className?: string }) {
  return <Link to="/" className={'jonomot-brand ' + className} aria-label="Jonomot home"><img src="/brand/jonomot-mark.svg" alt="" /><span>jonomot<span className="jonomot-brand__period">.</span></span></Link>;
}
