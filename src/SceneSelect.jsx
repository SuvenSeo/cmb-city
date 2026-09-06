import {useEffect, useId, useRef, useState} from 'react';
import {Check, ChevronDown} from 'lucide-react';

export default function SceneSelect({label, value, options, onChange, disabled, open, onOpen, children}) {
  const id = useId(), root = useRef(null), trigger = useRef(null), rows = useRef([]);
  const [active, setActive] = useState(0);
  const selected = options.find(option => option.value === value) || options[0];
  const Icon = selected.icon;
  useEffect(() => {
    if (!open) return;
    const index = Math.max(0, options.findIndex(option => option.value === value));
    setActive(index); rows.current[index]?.focus();
    const outside = event => {if (!root.current?.contains(event.target)) onOpen(false);};
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, value, options, onOpen]);
  function close() {onOpen(false); trigger.current?.focus();}
  function choose(option) {onChange(option.value); close();}
  function keys(event) {
    if (event.key === 'Escape') {event.preventDefault();event.stopPropagation();close();return;}
    if (event.key === 'Tab') {
      const control = root.current?.querySelector('.select-footer input:not(:disabled)');
      if (!event.shiftKey && control) {event.preventDefault();control.focus();}
      else close();
      return;
    }
    let index = active;
    if (event.key === 'ArrowDown') index = (active + 1) % options.length;
    else if (event.key === 'ArrowUp') index = (active - 1 + options.length) % options.length;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = options.length - 1;
    else if (event.key.length === 1 && /[a-z]/i.test(event.key)) {
      const match = options.findIndex(option => option.label.toLowerCase().startsWith(event.key.toLowerCase()));
      if (match < 0) return; index = match;
    } else return;
    event.preventDefault();setActive(index);rows.current[index]?.focus();
  }
  return <div className="scene-select" ref={root} onBlur={event => {
    if (open && !event.currentTarget.contains(event.relatedTarget)) onOpen(false);
  }}>
    <button className="select-trigger" ref={trigger} type="button" role="combobox" aria-label={label}
      aria-expanded={open} aria-controls={`${id}-list`} aria-haspopup="listbox" disabled={disabled}
      onClick={() => onOpen(!open)} onKeyDown={event => {
        if (['ArrowDown','ArrowUp'].includes(event.key)) {event.preventDefault();onOpen(true);}
      }}>
      <span className="select-symbol"><Icon aria-hidden="true" /></span>
      <span className="select-copy"><small>{label}</small><span>{selected.label}</span></span>
      <ChevronDown className={open ? 'select-chevron is-open' : 'select-chevron'} aria-hidden="true" />
    </button>
    {open && <div className="select-popover" onKeyDown={event => {if(event.key === 'Escape'){event.preventDefault();close();}}}>
      <p className="select-heading">{label === 'Weather' ? 'Set the atmosphere' : 'Follow the light'}</p>
      <div id={`${id}-list`} role="listbox" aria-label={label} onKeyDown={keys}>
        {options.map((option,index) => {
          const OptionIcon = option.icon;
          return <button key={option.value} type="button" role="option" aria-selected={value === option.value}
            className={`select-option${active === index ? ' is-focused' : ''}`} tabIndex={-1}
            ref={element => {rows.current[index] = element;}} onFocus={() => setActive(index)} onClick={() => choose(option)}>
            <span className={`option-symbol option-${option.value}`}><OptionIcon aria-hidden="true" /></span>
            <span className="option-copy"><strong>{option.label}</strong><small>{option.description}</small></span>
            {value === option.value && <Check className="option-check" aria-hidden="true" />}
          </button>;
        })}
      </div>
      {children && <div className="select-footer">{children}</div>}
    </div>}
  </div>;
}
