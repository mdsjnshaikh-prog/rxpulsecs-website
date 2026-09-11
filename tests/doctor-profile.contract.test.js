const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = {
  RXPULSE_SUPABASE_URL: 'https://example.supabase.co',
  RXPULSE_SUPABASE_ANON_KEY: 'public-anon-key',
  location: { pathname: '/doctors/idD1/test-doctor', search: '', href: 'https://www.rxpulsecs.com/doctors/idD1/test-doctor' },
};

const profileModule = require('../doctor-profile.js');

const allowedPublicColumns = [
  'id', 'slug', 'name', 'qualifications', 'specialties', 'bmdcNumber', 'designation', 'workplace',
  'bio', 'expertise', 'chamberInfo', 'timings', 'whatsappNumber', 'profilePhotoUrl', 'template',
  'writings', 'updated_at',
];

test('anonymous profile SELECT stays within the backend public-column contract', () => {
  assert.deepEqual(profileModule.PUBLIC_PROFILE_SELECT, allowedPublicColumns);
  for (const protectedColumn of ['doctorId', 'isApproved', 'approvalStatus', 'editHistory', 'rejectionReason', 'analytics']) {
    assert.equal(profileModule.PUBLIC_PROFILE_SELECT.includes(protectedColumn), false);
  }
});

test('theme enhancement query also avoids protected approval and doctor identity columns', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'doctor-profile-theme.js'), 'utf8');
  const selectBlock = source.slice(source.indexOf('const select = ['), source.indexOf('].join(",");', source.indexOf('const select = [')));
  for (const protectedColumn of ['doctorId', 'isApproved', 'approvalStatus']) {
    assert.equal(selectBlock.includes(`"${protectedColumn}"`), false);
  }
  assert.match(source, /Anonymous RLS already excludes non-public profiles/);
});

test('RLS-returned eligible profile loads and renders without client approval fields', async () => {
  global.fetch = async (url) => {
    const parsed = new URL(url);
    assert.equal(parsed.searchParams.get('select'), allowedPublicColumns.join(','));
    return { ok: true, json: async () => [{ id: 'doctor-uuid', slug: 'idD1/test-doctor', name: 'Dr Test', bmdcNumber: 'A-123', qualifications: 'MBBS', specialties: 'Medicine' }] };
  };

  const profile = await profileModule.findProfile('idD1/test-doctor');
  assert.equal(profile.id, 'doctor-uuid');
  assert.match(profileModule.renderTemplate(profile, ''), /Dr Test/);
});

test('RLS-hidden or ineligible profile is not exposed', async () => {
  global.fetch = async () => ({ ok: true, json: async () => [] });
  assert.equal(await profileModule.findProfile('idD1/hidden-doctor'), null);
});

test('related public chamber data is keyed by publicProfiles.id', async () => {
  const requested = [];
  global.fetch = async (url) => {
    requested.push(new URL(url));
    return { ok: true, json: async () => [] };
  };

  await profileModule.loadChamberData('profile-row-id');
  assert.equal(requested.length, 3);
  for (const url of requested) assert.equal(url.searchParams.get('doctor_id'), 'eq.profile-row-id');
});

test('BMDC is visibly labelled while user-controlled identity fields stay escaped', () => {
  const html = profileModule.renderIdentity({
    name: '<img src=x onerror=alert(1)>',
    bmdcNumber: 'A-123<script>',
    qualifications: 'MBBS & FCPS',
    specialties: 'Medicine',
  });

  assert.match(html, /BMDC Registration/);
  assert.match(html, /A-123&lt;script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /<script>|<img src=x/);
});

test('unsafe URLs are rejected and missing chamber, schedule, and availability data render safely', () => {
  assert.equal(profileModule.safeHttpUrl('javascript:alert(1)'), '');
  assert.equal(profileModule.safeImageUrl('data:text/html;base64,PHNjcmlwdD4='), '');
  assert.doesNotThrow(() => profileModule.renderChamberWidget([], undefined, undefined));
  assert.match(profileModule.renderChamberWidget([], undefined, undefined), /Chamber information not configured yet/);
});
