'use client';

import { useEffect, useState } from 'react';

const NAME_STORAGE_KEY = 'app-company-name';
const LOGO_STORAGE_KEY = 'app-company-logo';
const ICON_STORAGE_KEY = 'app-company-icon';

const NAME_EVENT = 'company-name-change';
const LOGO_EVENT = 'company-logo-change';
const ICON_EVENT = 'company-icon-change';

const DEFAULT_NAME = 'Admin App';

export function useCompanyName() {
  const [companyName, setCompanyNameState] = useState<string>(DEFAULT_NAME);
  const [companyLogo, setCompanyLogoState] = useState<string>('');
  const [companyIcon, setCompanyIconState] = useState<string>('');

  useEffect(() => {
    // 1. Carga inicial desde localStorage
    const storedName = localStorage.getItem(NAME_STORAGE_KEY);
    if (storedName) setCompanyNameState(storedName);

    const storedLogo = localStorage.getItem(LOGO_STORAGE_KEY);
    if (storedLogo) setCompanyLogoState(storedLogo);

    const storedIcon = localStorage.getItem(ICON_STORAGE_KEY);
    if (storedIcon) setCompanyIconState(storedIcon);

    // 2. Handlers para CustomEvents
    const handleNameChange = (e: Event) => {
      const custom = e as CustomEvent<string>;
      setCompanyNameState(custom.detail);
    };

    const handleLogoChange = (e: Event) => {
      const custom = e as CustomEvent<string>;
      setCompanyLogoState(custom.detail);
    };

    const handleIconChange = (e: Event) => {
      const custom = e as CustomEvent<string>;
      setCompanyIconState(custom.detail);
    };

    window.addEventListener(NAME_EVENT, handleNameChange);
    window.addEventListener(LOGO_EVENT, handleLogoChange);
    window.addEventListener(ICON_EVENT, handleIconChange);

    return () => {
      window.removeEventListener(NAME_EVENT, handleNameChange);
      window.removeEventListener(LOGO_EVENT, handleLogoChange);
      window.removeEventListener(ICON_EVENT, handleIconChange);
    };
  }, []);

  // Setters que guardan en localStorage y emiten eventos
  const setCompanyName = (name: string) => {
    const value = name.trim() || DEFAULT_NAME;
    localStorage.setItem(NAME_STORAGE_KEY, value);
    setCompanyNameState(value);
    window.dispatchEvent(new CustomEvent(NAME_EVENT, { detail: value }));
  };

  const setCompanyLogo = (logo: string) => {
    const value = logo || '';
    localStorage.setItem(LOGO_STORAGE_KEY, value);
    setCompanyLogoState(value);
    window.dispatchEvent(new CustomEvent(LOGO_EVENT, { detail: value }));
  };

  const setCompanyIcon = (icon: string) => {
    const value = icon || '';
    localStorage.setItem(ICON_STORAGE_KEY, value);
    setCompanyIconState(value);
    window.dispatchEvent(new CustomEvent(ICON_EVENT, { detail: value }));
  };

  return { 
    companyName, 
    companyLogo, 
    companyIcon,
    setCompanyName, 
    setCompanyLogo,
    setCompanyIcon
  };
}