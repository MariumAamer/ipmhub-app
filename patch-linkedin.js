// Usage (from D:\IPMMobileApp):
//   node patch-linkedin.js src\screens\SignUpScreen.tsx src\screens\SignInScreen.tsx
const fs = require('fs');
const files = process.argv.slice(2);
if (!files.length) { console.error('Pass the screen file paths.'); process.exit(1); }

for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  const nl = s.includes('\r\n') ? '\r\n' : '\n';
  s = s.replace(/\r\n/g, '\n');
  if (!s.includes('InAppBrowser.open(')) { console.log(`SKIP (already patched?): ${f}`); continue; }

  const multi = s.includes('setErrors({general');
  const clear = multi ? 'setErrors({});' : "setError('');";
  const setErr = m => (multi ? `setErrors({general: ${m}})` : `setError(${m})`);
  const finish = multi
    ? 'const route = await getPostAuthRoute(user);\n      navigation.replace(route);'
    : 'await handlePostLogin(user, navigation);';

  const handler = `const handleLinkedIn = async () => {
    setLinkedinLoading(true);
    ${clear}

    try {
      // Opens the system browser via Linking and waits for the
      // ipmhub://linkedin-callback deep link (no InAppBrowser native module).
      const redirectUrl = await openLinkedInAuth(
        LINKEDIN_AUTH_URL,
        LINKEDIN_APP_REDIRECT,
      );

      if (!redirectUrl) {
        // User came back without finishing — not an error, stop quietly.
        return;
      }

      const match = redirectUrl.match(/[?&]code=([^&]+)/);
      if (!match) {
        // TEMP DEBUG
        ${setErr('`DEBUG: no code in redirect URL: ${redirectUrl}`')};
        return;
      }
      const user = await socialLogin('linkedin', decodeURIComponent(match[1]));
      ${finish}
    } catch (err: any) {
      // TEMP DEBUG
      ${setErr('`DEBUG LinkedIn: ${err?.message || JSON.stringify(err)}`')};
    } finally {
      setLinkedinLoading(false);
    }
  };
`;

  const start = s.indexOf('const handleLinkedIn = async () => {');
  const end = s.indexOf('\n  return (\n    <KeyboardAvoidingView');
  if (start < 0 || end < 0) { console.error(`FAILED anchors not found: ${f}`); continue; }
  s = s.slice(0, start) + handler + s.slice(end);
  s = s.replace("import {InAppBrowser} from 'react-native-inappbrowser-reborn';",
                "import {openLinkedInAuth} from '../api/linkedinAuth';");
  fs.writeFileSync(f, s.replace(/\n/g, nl));
  console.log(`Patched: ${f}`);
}