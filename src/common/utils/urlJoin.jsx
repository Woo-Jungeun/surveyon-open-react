export function urlJoin(...parts) {
    return parts
      .filter(Boolean)
      .map((p, i) =>
        i === 0 ? String(p).replace(/\/+$/,'') : String(p).replace(/^\/+|\/+$/g,'')
      )
      .join('/');
  }