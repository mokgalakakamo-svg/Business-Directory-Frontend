import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, ArrowDownToLine, ArrowLeft, ArrowRight, Building2, Check,
  ChevronDown, ChevronRight, CircleHelp, FileBadge, FileText, Filter,
  Globe2, LayoutDashboard, LoaderCircle, MapPin, Menu, MoreHorizontal,
  Pencil, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, Trash2,
  UploadCloud, Users, X,
} from 'lucide-react';
import './styles.css';

const PAGE_SIZE = 50;
const EMPTY_FORM = {
  name: '', registration_number: '', industry: '', description: '',
  address: '', city: '', province: '', postal_code: '', country: 'South Africa',
  phone: '', email: '', website: '',
};
const FALLBACK_TYPES = [
  ['cipc_registration', 'CIPC registration certificate'],
  ['tax_clearance', 'Tax clearance certificate'],
  ['bbbee_certificate', 'B-BBEE certificate or affidavit'],
  ['proof_of_address', 'Proof of address'], ['company_profile', 'Company profile'],
  ['bank_confirmation', 'Bank confirmation letter'], ['vat_registration', 'VAT registration certificate'],
  ['director_id', 'Director or member ID'], ['other', 'Other'],
].map(([value, label]) => ({ value, label }));

function readSettings() {
  try { return JSON.parse(sessionStorage.getItem('directory-settings') || '{}'); }
  catch { return {}; }
}

function App() {
  const [settings, setSettings] = useState(readSettings);
  const [businesses, setBusinesses] = useState([]);
  const [documentTypes, setDocumentTypes] = useState(FALLBACK_TYPES);
  const [query, setQuery] = useState('');
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [skip, setSkip] = useState(0);
  const [selected, setSelected] = useState(null);
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(!readSettings().baseUrl || !readSettings().apiKey);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const api = async (path, options = {}) => {
    if (!settings.baseUrl || !settings.apiKey) throw new Error('Connect your API in settings to get started.');
    const headers = new Headers(options.headers || {});
    headers.set('X-API-Key', settings.apiKey);
    if (options.body && !(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
    const response = await fetch(`${settings.baseUrl.replace(/\/$/, '')}${path}`, { ...options, headers });
    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try { const body = await response.json(); message = body.detail || message; } catch { /* response was not JSON */ }
      throw new Error(message);
    }
    return response.status === 204 ? null : response.json();
  };

  const loadBusinesses = async (offset = skip) => {
    if (!settings.baseUrl || !settings.apiKey) return;
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ skip: String(offset), limit: String(PAGE_SIZE) });
      if (query.trim()) params.set('q', query.trim());
      if (industry) params.set('industry', industry);
      if (city.trim()) params.set('city', city.trim());
      if (province.trim()) params.set('province', province.trim());
      const result = await api(`/businesses?${params}`);
      setBusinesses(result);
      setSelected((current) => current ? result.find((business) => business.id === current.id) || null : null);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadBusinesses(skip); }, [settings.baseUrl, settings.apiKey, skip]);
  useEffect(() => {
    if (!settings.baseUrl || !settings.apiKey) return;
    const timer = setTimeout(() => loadBusinesses(0), 300);
    return () => clearTimeout(timer);
  }, [query, industry, city, province]);
  useEffect(() => {
    if (!settings.baseUrl || !settings.apiKey) return;
    api('/document-types').then(setDocumentTypes).catch(() => setDocumentTypes(FALLBACK_TYPES));
  }, [settings.baseUrl, settings.apiKey]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const industries = useMemo(() => [...new Set(businesses.map((b) => b.industry).filter(Boolean))].sort(), [businesses]);
  const filteredCount = businesses.length;
  const clearFilters = () => { setQuery(''); setIndustry(''); setCity(''); setProvince(''); setSkip(0); };
  const connect = (next) => {
    const clean = { baseUrl: (next.baseUrl || '').trim(), apiKey: (next.apiKey || '').trim() };
    setSettings(clean); sessionStorage.setItem('directory-settings', JSON.stringify(clean));
    setSettingsOpen(false); setSkip(0); setNotice('API connection saved for this session.');
  };
  const beginCreate = () => { setForm(EMPTY_FORM); setModal({ type: 'create' }); setError(''); };
  const beginEdit = (business) => { setForm(Object.fromEntries(Object.keys(EMPTY_FORM).map((key) => [key, business[key] ?? '']))); setModal({ type: 'edit', business }); setError(''); };
  const saveBusiness = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    const payload = Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim() || null]));
    payload.name = form.name.trim(); payload.country = form.country.trim() || 'South Africa';
    try {
      const item = modal.type === 'create'
        ? await api('/businesses', { method: 'POST', body: JSON.stringify(payload) })
        : await api(`/businesses/${modal.business.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
      setModal(null); setNotice(modal.type === 'create' ? 'Business added to your directory.' : 'Business details updated.');
      if (skip !== 0) setSkip(0); else await loadBusinesses(0);
      setSelected(item);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const deleteBusiness = async (business) => {
    if (!window.confirm(`Delete ${business.name} and its documents? This cannot be undone.`)) return;
    setBusy(true); setError('');
    try {
      await api(`/businesses/${business.id}`, { method: 'DELETE' });
      setSelected(null); setMenuOpen(false); setNotice('Business and its documents deleted.'); await loadBusinesses(skip);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const uploadDocument = async (event) => {
    const file = event.target.files?.[0]; if (!file || !selected) return;
    if (file.size > 10 * 1024 * 1024) { setError('Files must be 10 MB or smaller.'); event.target.value = ''; return; }
    const data = new FormData(); data.set('document_type', event.target.form.document_type.value); data.set('file', file);
    setBusy(true); setError('');
    try {
      const result = await api(`/businesses/${selected.id}/documents`, { method: 'POST', body: data });
      setUploadedDocs((items) => [{ businessId: selected.id, id: result.document_id, filename: file.name, type: event.target.form.document_type.value }, ...items]);
      setNotice(`${file.name} uploaded successfully.`);
    }
    catch (e) { setError(e.message); }
    finally { setBusy(false); event.target.value = ''; }
  };
  const downloadDocument = async (documentId, filename) => {
    try {
      const response = await fetch(`${settings.baseUrl.replace(/\/$/, '')}/businesses/${selected.id}/documents/${documentId}`, { headers: { 'X-API-Key': settings.apiKey } });
      if (!response.ok) throw new Error('Could not download this document.');
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = filename || 'document'; link.click(); URL.revokeObjectURL(url);
    } catch (e) { setError(e.message); }
  };

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><span className="brand-mark"><Building2 size={19} /></span><span>Northstar<span className="brand-light">Directory</span></span><button className="icon-button mobile-close" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X size={18} /></button></div>
      <div className="workspace-label">WORKSPACE</div>
      <button className="workspace-select"><span className="workspace-avatar">AC</span><span className="workspace-copy"><b>Acme Collective</b><small>Business workspace</small></span><ChevronDown size={15} /></button>
      <div className="nav-label">MANAGE</div>
      <nav><button className="nav-item active"><LayoutDashboard size={17} />Directory<span className="nav-count">{businesses.length}</span></button><button className="nav-item" onClick={() => setNotice('Document records are managed from each business profile.')}><FileText size={17} />Documents</button><button className="nav-item" onClick={() => setNotice('Your directory is up to date.')}><Activity size={17} />Activity</button></nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><CircleHelp size={17} /></div><b>Need a hand?</b><p>Keep your business details and documents in one place.</p><button onClick={() => setNotice('Contact your workspace administrator for help.')}>Get support <ArrowRight size={14} /></button></div><button className="nav-item settings-link" onClick={() => setSettingsOpen(true)}><Settings2 size={17} />API connection</button><div className="profile"><div className="profile-avatar">JD</div><div className="profile-copy"><b>Jordan Davis</b><small>Workspace admin</small></div><MoreHorizontal size={19} /></div></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="crumbs"><button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={20} /></button><span>Workspace</span><ChevronRight size={14} /><b>Directory</b></div><div className="top-actions"><span className="connection-indicator"><i className={settings.baseUrl && settings.apiKey ? 'online' : ''} />{settings.baseUrl && settings.apiKey ? 'Connected' : 'Not connected'}</span><button className="icon-button top-settings" onClick={() => setSettingsOpen(true)} aria-label="API settings"><Settings2 size={18} /></button><div className="profile-avatar top-avatar">JD</div></div></header>
      <div className="page-wrap">
        <div className="page-heading"><div><div className="eyebrow">YOUR ORGANISATION</div><h1>Business directory</h1><p>One place for the businesses you work with.</p></div><button className="button button-primary" onClick={beginCreate}><Plus size={17} />Add business</button></div>

        <section className="overview-grid">
          <article className="overview-card"><div className="stat-icon indigo"><Building2 size={18} /></div><div className="stat-label">BUSINESSES ON THIS PAGE</div><div className="stat-value">{loading ? '—' : filteredCount}<span className="stat-caption">records</span></div><div className="stat-foot"><span className="tiny-dot green-dot" />Directory overview</div></article>
          <article className="overview-card"><div className="stat-icon mint"><ShieldCheck size={18} /></div><div className="stat-label">API CONNECTION</div><div className="stat-value status-value">{settings.baseUrl && settings.apiKey ? 'Connected' : 'Setup needed'}</div><div className="stat-foot"><span className={`tiny-dot ${settings.baseUrl && settings.apiKey ? 'green-dot' : 'amber-dot'}`} />{settings.baseUrl ? settings.baseUrl : 'Add your API details to begin'}</div></article>
          <article className="overview-card"><div className="stat-icon gold"><FileBadge size={18} /></div><div className="stat-label">DOCUMENT TYPES</div><div className="stat-value">{documentTypes.length}<span className="stat-caption">available</span></div><div className="stat-foot"><span className="tiny-dot blue-dot" />Accepted upload categories</div></article>
        </section>

        <section className="directory-card">
          <div className="directory-head"><div><h2>All businesses</h2><p>Search, filter, and manage your directory.</p></div><button className="button button-secondary compact-filter" onClick={() => setNotice('Use the filters below to narrow your directory.')}><SlidersHorizontal size={16} />Filters</button></div>
          <div className="filters-row"><label className="search-box"><Search size={17} /><input value={query} onChange={(e) => { setQuery(e.target.value); setSkip(0); }} placeholder="Search businesses..." /><kbd>⌘ K</kbd></label><label className="filter-select"><Filter size={15} /><select value={industry} onChange={(e) => { setIndustry(e.target.value); setSkip(0); }}><option value="">All industries</option>{industries.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label><label className="filter-input"><MapPin size={15} /><input value={city} onChange={(e) => { setCity(e.target.value); setSkip(0); }} placeholder="City" /></label><label className="filter-input"><MapPin size={15} /><input value={province} onChange={(e) => { setProvince(e.target.value); setSkip(0); }} placeholder="Province" /></label><button className="clear-filters" onClick={clearFilters}>Clear filters</button></div>
          {error && !modal && <div className="inline-error"><CircleHelp size={16} />{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}
          <div className="table-scroll"><table><thead><tr><th><input type="checkbox" aria-label="Select all businesses" disabled /></th><th>BUSINESS <ChevronDown size={12} /></th><th>INDUSTRY</th><th>LOCATION</th><th>CONTACT</th><th>ADDED</th><th></th></tr></thead><tbody>
            {loading && <tr><td colSpan="7" className="empty-row"><LoaderCircle className="spin" size={20} />Loading businesses…</td></tr>}
            {!loading && businesses.map((business, index) => <tr key={business.id} className={selected?.id === business.id ? 'selected-row' : ''} onClick={() => { setSelected(business); setMenuOpen(false); }}>
              <td onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${business.name}`} /></td><td><div className="business-cell"><div className={`business-logo logo-${index % 5}`}>{business.name.trim().slice(0, 1).toUpperCase()}</div><div><b>{business.name}</b><small>{business.registration_number || `Business ID ${business.id}`}</small></div></div></td><td><span className="industry-tag">{business.industry || 'Unspecified'}</span></td><td><div className="location-cell">{business.city || business.province ? <><span>{business.city || business.province}</span><small>{business.province && business.city ? `${business.province}, ` : ''}{business.country}</small></> : <span className="muted">Location not set</span>}</div></td><td>{business.email ? <a className="contact-link" href={`mailto:${business.email}`} onClick={(e) => e.stopPropagation()}>{business.email}</a> : <span className="muted">—</span>}</td><td className="date-cell">{business.created_at ? new Date(business.created_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td><td><button className="row-more" aria-label={`Open ${business.name}`} onClick={(e) => { e.stopPropagation(); setSelected(business); setMenuOpen(true); }}>···</button></td>
            </tr>)}
            {!loading && !businesses.length && <tr><td colSpan="7" className="empty-state"><div className="empty-art"><Users size={22} /></div><b>{error ? 'Connect to your API' : 'No businesses found'}</b><p>{error ? 'Set your API URL and key to load your directory.' : 'Try adjusting your search or add your first business.'}</p>{!error && <button className="button button-secondary" onClick={beginCreate}><Plus size={15} />Add a business</button>}</td></tr>}
          </tbody></table></div>
          <div className="table-footer"><span>Showing <b>{businesses.length ? skip + 1 : 0}–{skip + businesses.length}</b> of <b>{businesses.length === PAGE_SIZE ? '50+' : businesses.length}</b> businesses</span><div className="pagination"><button disabled={skip === 0 || loading} onClick={() => setSkip(Math.max(0, skip - PAGE_SIZE))}><ArrowLeft size={15} />Previous</button><span className="page-chip">{Math.floor(skip / PAGE_SIZE) + 1}</span><button disabled={businesses.length < PAGE_SIZE || loading} onClick={() => setSkip(skip + PAGE_SIZE)}>Next<ArrowRight size={15} /></button></div></div>
        </section>
        <footer className="page-footer"><span>© 2026 Northstar Directory</span><span><a href="#privacy">Privacy</a><a href="#terms">Terms</a><a href="#help">Help centre</a></span></footer>
      </div>
    </main>

    {selected && <><button className="scrim" onClick={() => { setSelected(null); setMenuOpen(false); }} aria-label="Close business details" /><aside className="detail-panel"><div className="detail-header"><span>BUSINESS PROFILE</span><button className="icon-button" onClick={() => { setSelected(null); setMenuOpen(false); }} aria-label="Close details"><X size={18} /></button></div><div className="detail-identity"><div className="business-logo detail-logo">{selected.name.slice(0, 1).toUpperCase()}</div><h2>{selected.name}</h2><span className="industry-tag">{selected.industry || 'Unspecified industry'}</span><p>{selected.description || 'Add a short description to give your team more context about this business.'}</p><div className="detail-actions"><button className="button button-primary" onClick={() => beginEdit(selected)}><Pencil size={15} />Edit business</button><div className="menu-wrap"><button className="button button-secondary icon-only" onClick={() => setMenuOpen(!menuOpen)} aria-label="More actions"><MoreHorizontal size={17} /></button>{menuOpen && <div className="action-menu"><button className="danger-action" onClick={() => deleteBusiness(selected)}><Trash2 size={15} />Delete business</button></div>}</div></div></div><div className="detail-section"><h3>Business details</h3><DetailRow label="Registration number" value={selected.registration_number} /><DetailRow label="Industry" value={selected.industry} /><DetailRow label="Phone" value={selected.phone} /><DetailRow label="Email" value={selected.email} link={selected.email ? `mailto:${selected.email}` : null} /><DetailRow label="Website" value={selected.website} link={selected.website} /><DetailRow label="Address" value={[selected.address, selected.city, selected.province, selected.postal_code, selected.country].filter(Boolean).join(', ')} /></div><div className="detail-section"><div className="section-title"><h3>Documents</h3><span className="count-pill">{uploadedDocs.filter((doc) => doc.businessId === selected.id).length} uploaded this session</span></div><p className="section-hint">Add a document to this business profile. Maximum file size: 10 MB.</p>{error && <div className="inline-error panel-error">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={15} /></button></div>}<form className="upload-form"><div className="select-wrap"><select name="document_type" defaultValue={documentTypes[0]?.value}>{documentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select><ChevronDown size={14} /></div><label className="upload-drop"><UploadCloud size={19} /><span><b>Choose a file</b> or drag it here</span><small>PDF, images, and other business documents</small><input type="file" onChange={uploadDocument} disabled={busy} /></label></form>{uploadedDocs.filter((doc) => doc.businessId === selected.id).map((doc) => <div className="uploaded-file" key={doc.id}><FileText size={17} /><span><b>{doc.filename}</b><small>{documentTypes.find((type) => type.value === doc.type)?.label || doc.type}</small></span><button onClick={() => downloadDocument(doc.id, doc.filename)} aria-label={`Download ${doc.filename}`}><ArrowDownToLine size={16} /></button></div>)}<div className="notice-box"><CircleHelp size={15} /><span>The API does not provide a route to list older files. Files uploaded this session appear here for download.</span></div></div><div className="detail-section detail-meta"><span>Created {selected.created_at ? new Date(selected.created_at).toLocaleDateString('en-ZA', { dateStyle: 'medium' }) : '—'}</span><span>Updated {selected.updated_at ? new Date(selected.updated_at).toLocaleDateString('en-ZA', { dateStyle: 'medium' }) : '—'}</span></div></aside></>}

    {settingsOpen && <SettingsModal initial={settings} onClose={() => setSettingsOpen(false)} onSave={connect} />}
    {modal && <BusinessModal type={modal.type} form={form} setForm={setForm} busy={busy} error={error} onClose={() => setModal(null)} onSubmit={saveBusiness} />}
    {notice && <div className="toast"><span className="toast-check"><Check size={14} /></span>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={15} /></button></div>}
  </div>;
}

function DetailRow({ label, value, link }) {
  return <div className="detail-row"><span>{label}</span>{value ? link ? <a href={link} target={link.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{value}<ArrowDownToLine className="external-mark" size={12} /></a> : <b>{value}</b> : <b className="muted">Not provided</b>}</div>;
}

function SettingsModal({ initial, onClose, onSave }) {
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl || '/api');
  const [apiKey, setApiKey] = useState(initial.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState('');
  const submit = async (event) => {
    event.preventDefault(); setMessage('');
    try {
      const response = await fetch(`${baseUrl.trim().replace(/\/$/, '')}/document-types`, { headers: { 'X-API-Key': apiKey.trim() } });
      if (!response.ok) throw new Error(response.status === 401 ? 'That API key was not accepted.' : `Could not connect (${response.status}). Check the API URL and CORS settings.`);
      onSave({ baseUrl, apiKey });
    } catch (e) { setMessage(e.message.includes('fetch') ? 'Could not reach the API. Check the URL and allow this frontend in the API CORS settings.' : e.message); }
  };
  return <div className="modal-backdrop"><div className="modal settings-modal"><div className="modal-head"><div><div className="eyebrow">CONNECTION</div><h2>Connect your API</h2><p>Enter the URL and shared key for your Business Document API.</p></div><button className="icon-button" onClick={onClose} aria-label="Close settings"><X size={18} /></button></div><form onSubmit={submit}><label className="form-label">API base URL<input required type="text" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="/api or http://localhost:8000" /></label><label className="form-label">API key<div className="password-wrap"><input required type={showKey ? 'text' : 'password'} value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Your BUSINESS_API_KEY" /><button type="button" onClick={() => setShowKey(!showKey)}>{showKey ? 'Hide' : 'Show'}</button></div></label><div className="security-note"><ShieldCheck size={16} /><span>Your key stays in this browser tab and is sent only to this API.</span></div>{message && <div className="form-error">{message}</div>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit"><Check size={16} />Connect</button></div></form></div></div>;
}

function BusinessModal({ type, form, setForm, busy, error, onClose, onSubmit }) {
  const fields = [
    ['name', 'Business name', 'text', true], ['registration_number', 'Registration number', 'text'],
    ['industry', 'Industry', 'text'], ['phone', 'Phone', 'tel'], ['email', 'Email', 'email'],
    ['website', 'Website', 'url'], ['address', 'Street address', 'text', false, true],
    ['city', 'City', 'text'], ['province', 'Province', 'text'], ['postal_code', 'Postal code', 'text'],
    ['country', 'Country', 'text'], ['description', 'Description', 'text', false, true],
  ];
  return <div className="modal-backdrop"><div className="modal business-modal"><div className="modal-head"><div><div className="eyebrow">BUSINESS DETAILS</div><h2>{type === 'create' ? 'Add a business' : 'Edit business'}</h2><p>Keep your directory information accurate and useful.</p></div><button className="icon-button" onClick={onClose} aria-label="Close form"><X size={18} /></button></div><form onSubmit={onSubmit}><div className="form-grid">{fields.map(([key, label, inputType, required, wide]) => <label key={key} className={`form-label ${wide ? 'wide-field' : ''}`}>{label}{key === 'description' ? <textarea rows="3" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /> : <input type={inputType} required={required} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />}</label>)}</div>{error && <div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}><Check size={16} />{busy ? 'Saving…' : type === 'create' ? 'Add business' : 'Save changes'}</button></div></form></div></div>;
}

createRoot(document.getElementById('root')).render(<App />);
