import { Children, Fragment, isValidElement, useMemo } from 'react';
import { SearchableSelect } from './SearchableSelect.jsx';

function flattenText(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(' ');
  if (isValidElement(node)) return flattenText(node.props.children);
  return '';
}

function collectOptions(children) {
  const options = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;

    if (child.type === Fragment) {
      options.push(...collectOptions(child.props.children));
      return;
    }

    if (typeof child.type === 'string' && child.type.toLowerCase() === 'option') {
      options.push({
        key: child.key ?? `${child.props.value ?? 'option'}-${options.length}`,
        value: child.props.value ?? '',
        label: child.props.children,
        searchText: flattenText(child.props.children),
        disabled: Boolean(child.props.disabled),
      });
    }
  });

  return options;
}

function splitClassName(className) {
  const containerTokens = [];
  const triggerTokens = [];
  const tokens = className.split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    if (token === 'input') continue;

    if (
      /^(?:w|min-w|max-w|basis)-/.test(token) ||
      /^(?:sm|md|lg|xl|2xl):(?:w|min-w|max-w|basis)-/.test(token) ||
      /^(?:shrink|grow|flex-1)$/.test(token) ||
      /^(?:sm|md|lg|xl|2xl):(?:shrink|grow|flex-1)$/.test(token)
    ) {
      containerTokens.push(token);
      continue;
    }

    triggerTokens.push(token);
  }

  return {
    containerClassName: containerTokens.join(' '),
    triggerClassName: triggerTokens.join(' '),
  };
}

export function Select({
  children,
  className = '',
  clearable = false,
  onChange,
  value = '',
  ...props
}) {
  const options = useMemo(() => collectOptions(children), [children]);
  const { containerClassName, triggerClassName } = useMemo(
    () => splitClassName(className),
    [className]
  );

  return (
    <SearchableSelect
      {...props}
      options={options}
      value={value}
      onChange={(nextValue) => onChange?.({ target: { value: nextValue == null ? '' : String(nextValue) } })}
      clearable={clearable}
      className={triggerClassName}
      containerClassName={containerClassName}
    />
  );
}
