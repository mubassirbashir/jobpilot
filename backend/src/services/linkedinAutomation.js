/**
 * LinkedIn Automation Service
 * Uses Playwright for browser automation to:
 * - Scrape job listings
 * - Easy Apply to jobs
 * - Update profile sections
 * - Read messages/notifications
 *
 * IMPORTANT: Runs with a real user session (cookies), respects rate limits.
 */
import { chromium } from 'playwright';
import { logger } from '../utils/logger.js';

const LINKEDIN_BASE = 'https://www.linkedin.com';
const DELAY_MIN = 1500;
const DELAY_MAX = 4000;

const delay = (ms) => new Promise(r => setTimeout(r, ms));
const randomDelay = () => delay(DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN));

// ─── Launch browser with stealth settings ─────────────────────────────────
async function launchBrowser(headless = true) {
  return chromium.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--lang=en-US,en',
    ],
  });
}

// ─── Create authenticated context from stored cookies ─────────────────────
async function createAuthContext(browser, cookies) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
  });
  if (cookies) {
    try {
      const parsed = typeof cookies === 'string' ? JSON.parse(cookies) : cookies;
      await context.addCookies(parsed);
    } catch { /* no cookies available */ }
  }
  // Inject stealth scripts
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.chrome = { runtime: {} };
  });
  return context;
}

// ─── Scrape LinkedIn Jobs ─────────────────────────────────────────────────
export async function scrapeLinkedInJobs({
  searchTerms = ['Product Designer'],
  locations = ['San Francisco', 'Remote'],
  datePosted = 'r86400', // last 24h
  easyApplyOnly = false,
  maxJobs = 50,
  cookies,
}) {
  const browser = await launchBrowser();
  const jobs = [];

  try {
    const context = await createAuthContext(browser, cookies);
    const page = await context.newPage();

    for (const term of searchTerms.slice(0, 3)) {
      for (const loc of locations.slice(0, 2)) {
        const params = new URLSearchParams({
          keywords: term,
          location: loc,
          f_TPR: datePosted,
          ...(easyApplyOnly && { f_LF: 'f_AL' }),
          start: 0,
        });

        await page.goto(`${LINKEDIN_BASE}/jobs/search/?${params}`, { waitUntil: 'networkidle', timeout: 30000 });
        await randomDelay();

        // Scroll to load more
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollBy(0, 500));
          await delay(800);
        }

        // Extract job cards
        const jobCards = await page.$$eval('.jobs-search__results-list li, .job-card-container', (cards) => {
          return cards.slice(0, 25).map(card => {
            const titleEl = card.querySelector('.job-card-list__title, .base-search-card__title, h3');
            const companyEl = card.querySelector('.job-card-container__primary-description, .base-search-card__subtitle, h4');
            const locationEl = card.querySelector('.job-card-container__metadata-item, .job-search-card__location');
            const linkEl = card.querySelector('a[href*="/jobs/view/"]');
            const easyApplyEl = card.querySelector('.job-card-container__apply-method');

            return {
              title: titleEl?.textContent?.trim(),
              company: companyEl?.textContent?.trim(),
              location: locationEl?.textContent?.trim(),
              url: linkEl?.href?.split('?')[0],
              isEasyApply: easyApplyEl?.textContent?.includes('Easy Apply') || false,
            };
          }).filter(j => j.title && j.url);
        });

        jobs.push(...jobCards.map(j => ({ ...j, source: 'linkedin', discoveredAt: new Date() })));
        logger.info(`Found ${jobCards.length} jobs for "${term}" in ${loc}`);

        await randomDelay();
        if (jobs.length >= maxJobs) break;
      }
    }
  } catch (err) {
    logger.error('LinkedIn scrape error:', err.message);
  } finally {
    await browser.close();
  }

  return jobs.slice(0, maxJobs);
}

// ─── Easy Apply to a Job ──────────────────────────────────────────────────
export async function easyApply({ jobUrl, userProfile, coverLetter, cv, cookies, onProgress }) {
  const browser = await launchBrowser();
  const result = { success: false, steps: [], error: null };

  try {
    const context = await createAuthContext(browser, cookies);
    const page = await context.newPage();

    onProgress?.('Navigating to job page...');
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await randomDelay();

    // Click Easy Apply button
    const easyApplyBtn = await page.$('.jobs-apply-button--top-card, [aria-label*="Easy Apply"]');
    if (!easyApplyBtn) {
      result.error = 'No Easy Apply button found — this job requires external application';
      return result;
    }

    await easyApplyBtn.click();
    await delay(2000);
    result.steps.push('Opened Easy Apply modal');
    onProgress?.('Filling application form...');

    // Multi-step form handler
    let step = 0;
    while (step < 10) {
      step++;

      // Check for phone field
      const phoneField = await page.$('input[id*="phoneNumber"]');
      if (phoneField) {
        const val = await phoneField.inputValue();
        if (!val) await phoneField.fill(userProfile?.phone || '+1 555-000-0000');
      }

      // Check for resume upload
      const resumeUpload = await page.$('input[type="file"][name*="resume"]');
      if (resumeUpload && cv?.filePath) {
        await resumeUpload.setInputFiles(cv.filePath);
        await delay(1500);
        result.steps.push('Resume uploaded');
      }

      // Fill text areas (cover letter, additional info)
      const textAreas = await page.$$('textarea');
      for (const ta of textAreas) {
        const label = await ta.evaluate(el => {
          const labelEl = document.querySelector(`label[for="${el.id}"]`);
          return labelEl?.textContent || el.placeholder || '';
        });
        if (label.toLowerCase().includes('cover') && coverLetter) {
          await ta.fill(coverLetter.slice(0, 2000));
          result.steps.push('Cover letter filled');
        }
      }

      // Handle yes/no questions (work authorization, etc.)
      const radioGroups = await page.$$('.jobs-easy-apply-form-element');
      for (const group of radioGroups) {
        const labelText = await group.$eval('label, legend', el => el.textContent?.trim()).catch(() => '');
        // Default to "Yes" for most authorization questions
        if (labelText.toLowerCase().includes('authorized') || labelText.toLowerCase().includes('require sponsorship')) {
          const yesRadio = await group.$('input[value="Yes"], input[value="true"]');
          if (yesRadio) await yesRadio.check().catch(() => {});
        }
      }

      // Try Next or Submit
      const nextBtn = await page.$('[aria-label="Continue to next step"], button[aria-label*="Next"]');
      const submitBtn = await page.$('[aria-label*="Submit application"], button[aria-label*="Submit"]');
      const reviewBtn = await page.$('[aria-label="Review your application"]');

      if (submitBtn) {
        await submitBtn.click();
        await delay(2000);
        result.success = true;
        result.steps.push('Application submitted!');
        onProgress?.('Application submitted successfully!');
        break;
      } else if (reviewBtn) {
        await reviewBtn.click();
        await delay(1500);
      } else if (nextBtn) {
        await nextBtn.click();
        await delay(1500);
        result.steps.push(`Completed step ${step}`);
      } else {
        // No more buttons — might be done or an error
        break;
      }
    }

  } catch (err) {
    logger.error('Easy Apply error:', err.message);
    result.error = err.message;
  } finally {
    await browser.close();
  }

  return result;
}

// ─── Fill External Application Form ─────────────────────────────────────
export async function fillExternalApplication({ applyUrl, userProfile, cv, coverLetter, answers, atsType, cookies, onProgress }) {
  const browser = await launchBrowser();
  const result = { success: false, fieldsFilledCount: 0, error: null };

  try {
    const context = await createAuthContext(browser, cookies);
    const page = await context.newPage();

    onProgress?.(`Opening application form (${atsType || 'external'})...`);
    await page.goto(applyUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await randomDelay();

    const info = cv?.content?.personalInfo || userProfile;
    const fieldMap = {
      // Common field patterns → value
      'first.?name|fname': info.name?.split(' ')[0] || '',
      'last.?name|lname': info.name?.split(' ').slice(1).join(' ') || '',
      'email': info.email || userProfile?.email || '',
      'phone': info.phone || '+1 555-000-0000',
      'address|street': info.location || 'San Francisco, CA',
      'city': 'San Francisco',
      'state|province': 'California',
      'zip|postal': '94105',
      'linkedin': info.linkedin || userProfile?.linkedin?.profileUrl || '',
      'portfolio|website': info.portfolio || '',
      'cover.?letter': coverLetter || '',
    };

    let filled = 0;

    // Fill text inputs
    const inputs = await page.$$('input[type="text"], input[type="email"], input[type="tel"], input[type="url"], textarea');
    for (const input of inputs) {
      const inputInfo = await input.evaluate(el => ({
        id: el.id, name: el.name, placeholder: el.placeholder,
        label: document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim() || '',
        type: el.type,
      }));

      const identifier = `${inputInfo.id} ${inputInfo.name} ${inputInfo.placeholder} ${inputInfo.label}`.toLowerCase();

      for (const [pattern, value] of Object.entries(fieldMap)) {
        if (value && new RegExp(pattern, 'i').test(identifier)) {
          await input.fill(String(value));
          filled++;
          await delay(200);
          break;
        }
      }
    }

    result.fieldsFilledCount = filled;
    onProgress?.(`Filled ${filled} form fields automatically`);

    // Handle select dropdowns (work authorization, etc.)
    const selects = await page.$$('select');
    for (const select of selects) {
      const label = await select.evaluate(el => {
        const l = document.querySelector(`label[for="${el.id}"]`);
        return l?.textContent?.trim() || '';
      });
      if (/authorized|work.*right|eligible/i.test(label)) {
        await select.selectOption({ index: 1 }).catch(() => {}); // Select "Yes"
      }
    }

    // Handle custom questions with AI answers
    if (answers?.length > 0) {
      const questionFields = await page.$$('textarea, input[type="text"]');
      for (const field of questionFields) {
        const fieldLabel = await field.evaluate(el => {
          const l = document.querySelector(`label[for="${el.id}"]`);
          return (l?.textContent || el.placeholder || '').trim();
        });

        const matchedAnswer = answers.find(a =>
          fieldLabel.toLowerCase().includes(a.question.toLowerCase().slice(0, 20))
        );
        if (matchedAnswer) {
          await field.fill(matchedAnswer.answer);
          filled++;
        }
      }
    }

    result.success = filled > 0;
    onProgress?.(`Form auto-filled: ${filled} fields. Ready to submit.`);

  } catch (err) {
    logger.error('External apply error:', err.message);
    result.error = err.message;
  } finally {
    await browser.close();
  }

  return result;
}

// ─── Signup to ATS Portal ────────────────────────────────────────────────
export async function signupToATS({ signupUrl, email, password, name, atsType, onProgress }) {
  const browser = await launchBrowser();
  const result = { success: false, email, error: null };

  try {
    const context = await createAuthContext(browser, null);
    const page = await context.newPage();

    onProgress?.(`Signing up to ${atsType} portal...`);
    await page.goto(signupUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await randomDelay();

    // Generic signup form handler
    const emailField = await page.$('input[type="email"], input[name*="email"], input[id*="email"]');
    const passwordField = await page.$('input[type="password"]');
    const nameField = await page.$('input[name*="name"], input[id*="name"], input[placeholder*="name"]');

    if (emailField) { await emailField.fill(email); await delay(300); }
    if (passwordField) { await passwordField.fill(password); await delay(300); }
    if (nameField) {
      const firstName = name.split(' ')[0];
      await nameField.fill(firstName);
    }

    // First/last name split
    const firstNameField = await page.$('input[name*="first"], input[id*="first"]');
    const lastNameField = await page.$('input[name*="last"], input[id*="last"]');
    if (firstNameField) await firstNameField.fill(name.split(' ')[0]);
    if (lastNameField) await lastNameField.fill(name.split(' ').slice(1).join(' ') || 'User');

    await randomDelay();

    // Submit
    const submitBtn = await page.$('button[type="submit"], input[type="submit"], button:has-text("Sign up"), button:has-text("Create account"), button:has-text("Register")');
    if (submitBtn) {
      await submitBtn.click();
      await delay(3000);
      result.success = true;
      onProgress?.(`Successfully signed up to ${atsType}`);
    }

  } catch (err) {
    logger.error('ATS signup error:', err.message);
    result.error = err.message;
  } finally {
    await browser.close();
  }

  return result;
}

// ─── Update LinkedIn Profile Section ─────────────────────────────────────
export async function updateLinkedInProfile({ section, content, cookies, onProgress }) {
  const browser = await launchBrowser();
  const result = { success: false, section, error: null };

  try {
    const context = await createAuthContext(browser, cookies);
    const page = await context.newPage();

    onProgress?.(`Updating LinkedIn ${section}...`);
    await page.goto(`${LINKEDIN_BASE}/in/me/edit/`, { waitUntil: 'networkidle', timeout: 30000 });
    await randomDelay();

    if (section === 'headline') {
      const editBtn = await page.$('[aria-label*="Edit intro"]');
      if (editBtn) {
        await editBtn.click();
        await delay(1500);
        const headlineField = await page.$('input[name="headline"]');
        if (headlineField) {
          await headlineField.triple_click();
          await headlineField.fill(content);
          const saveBtn = await page.$('button[aria-label*="Save"]');
          if (saveBtn) { await saveBtn.click(); result.success = true; }
        }
      }
    } else if (section === 'about') {
      const editAboutBtn = await page.$('[aria-label*="Edit about"]');
      if (editAboutBtn) {
        await editAboutBtn.click();
        await delay(1500);
        const aboutField = await page.$('textarea[name="summary"]');
        if (aboutField) {
          await aboutField.fill(content);
          const saveBtn = await page.$('button[aria-label*="Save"]');
          if (saveBtn) { await saveBtn.click(); result.success = true; }
        }
      }
    }

    onProgress?.(`LinkedIn ${section} updated successfully`);
  } catch (err) {
    logger.error('LinkedIn profile update error:', err.message);
    result.error = err.message;
  } finally {
    await browser.close();
  }

  return result;
}

// ─── Detect ATS type from URL ─────────────────────────────────────────────
export function detectATS(url) {
  if (!url) return null;
  const atsMap = {
    'greenhouse.io': 'greenhouse',
    'lever.co': 'lever',
    'workday.com': 'workday',
    'ashbyhq.com': 'ashby',
    'taleo.net': 'taleo',
    'icims.com': 'icims',
    'smartrecruiters.com': 'smartrecruiters',
    'jobvite.com': 'jobvite',
    'bamboohr.com': 'bamboohr',
    'rippling.com': 'rippling',
  };
  for (const [domain, ats] of Object.entries(atsMap)) {
    if (url.includes(domain)) return ats;
  }
  return 'custom';
}

export default {
  scrapeLinkedInJobs,
  easyApply,
  fillExternalApplication,
  signupToATS,
  updateLinkedInProfile,
  detectATS,
};
