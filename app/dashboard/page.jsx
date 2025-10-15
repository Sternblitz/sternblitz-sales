useEffect(() => {
  const input = document.getElementById("company-input");

  const onInput = () => {
    const v = input?.value?.trim() || "";
    setSim({ google_profile_url: v, ts: new Date().toISOString() });
  };

  const onPlace = (e) => {
    const url = e?.detail?.url || "";
    setSim({ google_profile_url: url, ts: new Date().toISOString() });
  };

  onInput();
  input?.addEventListener("input", onInput);
  window.addEventListener("sb:place-selected", onPlace);

  return () => {
    input?.removeEventListener("input", onInput);
    window.removeEventListener("sb:place-selected", onPlace);
  };
}, []);
