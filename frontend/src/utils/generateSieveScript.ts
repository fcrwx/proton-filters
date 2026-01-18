import { Filter } from '../types';

export function generateSieveScript(filter: Filter): string {
  const requires: string[] = [];
  const conditions: string[] = [];
  const actions: string[] = [];

  // Compute effective labels (including year if enabled)
  const effectiveLabels = [...filter.labels];
  if (filter.addYearLabel) {
    const currentYear = new Date().getFullYear().toString();
    if (!effectiveLabels.includes(currentYear)) {
      effectiveLabels.push(currentYear);
    }
  }

  // Determine required extensions
  if (filter.targetFolder || effectiveLabels.length > 0) {
    requires.push('fileinto');
  }
  // imap4flags needed for markRead or to check Trash status
  requires.push('imap4flags');
  if (filter.expirationDays !== null) {
    requires.push('vnd.proton.expire');
  }

  // Build conditions
  // Skip messages already in Trash
  conditions.push('not hasflag "\\\\Deleted"');
  if (filter.fromAddresses.length > 0) {
    // Separate full email addresses from domain-only patterns
    const fullEmails = filter.fromAddresses.filter((addr) => addr.includes('@'));
    const domains = filter.fromAddresses.filter((addr) => !addr.includes('@'));

    // Build individual from conditions
    const fromConditions: string[] = [];

    // Full email addresses use :is matching
    if (fullEmails.length === 1) {
      fromConditions.push(`address :is "from" "${fullEmails[0]}"`);
    } else if (fullEmails.length > 1) {
      const addresses = fullEmails.map((addr) => `"${addr}"`).join(', ');
      fromConditions.push(`address :is "from" [${addresses}]`);
    }

    // Domain patterns use :domain :contains matching
    for (const domain of domains) {
      fromConditions.push(`address :domain :contains "from" "${domain}"`);
    }

    // If multiple from conditions, wrap in anyof; otherwise use directly
    if (fromConditions.length === 1) {
      conditions.push(fromConditions[0]);
    } else if (fromConditions.length > 1) {
      conditions.push(`anyof (${fromConditions.join(', ')})`);
    }
  }

  if (filter.toAddress) {
    conditions.push(`address :is "to" "${filter.toAddress}"`);
  }

  // Build actions (order matters: expire, addflag, labels, folder, stop)
  if (filter.expirationDays !== null) {
    actions.push(`expire "day" "${filter.expirationDays}";`);
  }

  if (filter.markRead) {
    actions.push('addflag "\\\\Seen";');
  }

  // Labels are applied using fileinto with just the label name
  for (const label of effectiveLabels) {
    actions.push(`fileinto "${label}";`);
  }

  // Folder uses fileinto with the full path
  if (filter.targetFolder) {
    actions.push(`fileinto "${filter.targetFolder}";`);
  }

  // End with stop if we have any fileinto actions, otherwise keep
  if (filter.targetFolder || effectiveLabels.length > 0) {
    actions.push('stop;');
  } else {
    actions.push('keep;');
  }

  // Build the script
  const lines: string[] = [];

  // Add comment with filter name and generation timestamp
  const now = new Date();
  const timestamp = now.toLocaleString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  lines.push(`# Filter: ${filter.name}`);
  lines.push(`# Generated: ${timestamp}`);
  lines.push('');

  // Add require statement if needed
  if (requires.length > 0) {
    const requireList = requires.map((r) => `"${r}"`).join(', ');
    lines.push(`require [${requireList}];`);
    lines.push('');
  }

  // Add the if block
  if (conditions.length > 0) {
    const conditionStr = conditions.join(',\n       ');
    lines.push(`if allof (${conditionStr}) {`);
  } else {
    lines.push('if true {');
  }

  // Add actions
  for (const action of actions) {
    lines.push(`    ${action}`);
  }

  lines.push('}');
  lines.push('');

  return lines.join('\n');
}
