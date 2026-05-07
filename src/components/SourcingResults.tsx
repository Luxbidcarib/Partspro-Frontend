const cheerio = require('cheerio');
const { logger } = require('../utils/logger');
const supabase = require('../utils/supabase');

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY || '71b82493e861f581e4a77517233c8e28';

// ══════════════════════════════════════════════
// HTTP HELPERS
// ══════════════════════════════════════════════

async function fetchPage(url, render = false) {
  const apiUrl = `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}${render ? '&render=true' : ''}`;
  const resp = await fetch(apiUrl, { signal: AbortSignal.timeout(60000) });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`ScraperAPI ${resp.status}: ${body.substring(0, 200)}`);
  }
  return resp.text();
}

async function fetchJSON(url) {
  const resp = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`API ${resp.status}: ${body.substring(0, 200)}`);
  }
  return resp.json();
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Extract real URL from ScraperAPI proxy links
function extractRealUrl(link, fallbackQuery) {
  if (!link) return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(fallbackQuery)}`;
  if (link.includes('scraperapi.com')) {
    try { const u = new URL(link).searchParams.get('url'); if (u) return u; } catch (e) {}
    return `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(fallbackQuery)}`;
  }
  return link;
}

// ══════════════════════════════════════════════
// VEHICLE ORIGIN
// ══════════════════════════════════════════════

const JDM_MAKES = ['honda', 'acura', 'toyota', 'lexus', 'nissan', 'infiniti', 'mazda', 'subaru', 'mitsubishi', 'suzuki', 'isuzu', 'scion'];
const JDM_ONLY_SUPPLIERS = ['amayama', 'nengun'];
function shouldSkipSupplier(slug, make) { return JDM_ONLY_SUPPLIERS.includes(slug) && !JDM_MAKES.includes((make || '').toLowerCase()); }

// ══════════════════════════════════════════════
// SEARCH URL BUILDERS
// ══════════════════════════════════════════════

function buildSearchUrl(slug, { year, make, model, part, oem_number }) {
  const e = encodeURIComponent; const vp = `${year} ${make} ${model} ${part}`;
  switch (slug) {
    case 'rockauto': return oem_number ? `https://www.rockauto.com/en/partsearch/?partnum=${e(oem_number)}` : `https://www.rockauto.com/en/partsearch/?partnum=${e(part)}`;
    case 'lkq-online': case 'lkq': return `https://www.lkqonline.com/search#Year=${year}&Make=${e(make)}&Model=${e(model)}&q=${e(part)}`;
    case 'amayama': return oem_number ? `https://www.amayama.com/en/search?q=${e(oem_number)}` : `https://www.amayama.com/en/search?q=${e(`${make} ${model} ${part}`)}`;
    case 'nengun': return oem_number ? `https://www.nengun.com/search?q=${e(oem_number)}` : `https://www.nengun.com/search?q=${e(`${make} ${model} ${part}`)}`;
    case 'partsmax': return `https://partsmax.co/search/?searchterm=${e(vp)}`;
    case 'carpartpro': case 'car-part-pro': return 'https://pro.car-part.com/';
    default: return `https://www.google.com/search?q=${e(vp)}`;
  }
}

function generateSearchUrlResult(slug, supplierName, params) {
  return [{ supplier_name: supplierName, yard_name: supplierName, listing_url: buildSearchUrl(slug, params), listed_price: null, condition: null, in_stock: null, notes: 'Click to search', search_url: true, needs_call: false, has_price: false }];
}

// ══════════════════════════════════════════════
// CAR-PART.COM PART NAME MAPPING
// Maps AI part names to Car-Part.com dropdown values
// ══════════════════════════════════════════════

const CARPART_MAPPINGS = [
  { keywords: ['bumper', 'cover', 'front bumper'], carpart: 'Bumper Assy (Front)' },
  { keywords: ['rear bumper'], carpart: 'Bumper Assy (Rear)' },
  { keywords: ['bumper reinforcement', 'rebar', 'impact bar'], carpart: 'Bumper Reinforcement (Front)' },
  { keywords: ['headlight', 'headlamp', 'head light', 'head lamp'], carpart: 'Headlamp Assembly' },
  { keywords: ['tail light', 'tail lamp', 'taillight', 'taillamp'], carpart: 'Tail Lamp' },
  { keywords: ['hood'], carpart: 'Hood' },
  { keywords: ['fender'], carpart: 'Fender' },
  { keywords: ['door shell', 'front door'], carpart: 'Door Assembly (Front)' },
  { keywords: ['rear door'], carpart: 'Door Assembly (Rear)' },
  { keywords: ['mirror', 'side mirror'], carpart: 'Mirror (Side View)' },
  { keywords: ['grille', 'grill'], carpart: 'Grille' },
  { keywords: ['radiator support', 'core support'], carpart: 'Radiator Core Support' },
  { keywords: ['radiator'], carpart: 'Radiator' },
  { keywords: ['condenser', 'a/c condenser'], carpart: 'AC Condenser' },
  { keywords: ['quarter panel'], carpart: 'Quarter Panel' },
  { keywords: ['rocker panel', 'rocker'], carpart: 'Rocker Panel' },
  { keywords: ['windshield'], carpart: 'Windshield Glass' },
  { keywords: ['door glass', 'window glass'], carpart: 'Door Glass (Front)' },
  { keywords: ['wheel', 'rim'], carpart: 'Wheel' },
  { keywords: ['transmission'], carpart: 'Transmission' },
  { keywords: ['engine', 'motor'], carpart: 'Engine Assembly' },
  { keywords: ['strut', 'shock', 'suspension'], carpart: 'Strut' },
  { keywords: ['control arm', 'trailing arm'], carpart: 'Control Arm (Front Lower)' },
  { keywords: ['spindle', 'knuckle'], carpart: 'Spindle Knuckle (Front)' },
  { keywords: ['axle', 'cv axle'], carpart: 'Axle Shaft' },
  { keywords: ['steering rack', 'rack and pinion'], carpart: 'Steering Gear/Rack' },
  { keywords: ['steering column'], carpart: 'Steering Column' },
  { keywords: ['seat'], carpart: 'Seat (Front)' },
  { keywords: ['airbag', 'air bag'], carpart: 'Air Bag' },
  { keywords: ['wiring harness'], carpart: 'Wiring Harness' },
  { keywords: ['liftgate', 'tailgate', 'hatch'], carpart: 'Liftgate/Tailgate' },
  { keywords: ['trunk lid'], carpart: 'Trunk Lid/Hatch' },
  { keywords: ['abs module', 'abs pump'], carpart: 'ABS Unit' },
  { keywords: ['alternator'], carpart: 'Alternator' },
  { keywords: ['starter'], carpart: 'Starter Motor' },
  { keywords: ['ac compressor', 'a/c compressor'], carpart: 'AC Compressor' },
  { keywords: ['brake caliper'], carpart: 'Caliper' },
  { keywords: ['fuel pump'], carpart: 'Fuel Pump' },
  { keywords: ['headliner'], carpart: 'Headliner' },
  { keywords: ['instrument cluster', 'gauge cluster'], carpart: 'Speedometer/Instrument Cluster' },
  { keywords: ['info screen', 'display', 'infotainment'], carpart: 'Info/GPS/TV Screen' },
];

function mapPartToCarPart(partName) {
  const lower = partName.toLowerCase();
  for (const m of CARPART_MAPPINGS) {
    for (const kw of m.keywords) {
      if (lower.includes(kw)) return m.carpart;
    }
  }
  // Return simplified name as fallback
  return partName.split('/')[0].split('-')[0].split('(')[0].trim();
}

// ══════════════════════════════════════════════
// CAR-PART.COM — Pure HTTP, no browser
// Step 1: GET homepage, find form values
// Step 2: Submit search via URL params
// Step 3: Handle interchange page
// Step 4: Parse results
// ══════════════════════════════════════════════

async function scrapeCarPartPublic({ year, make, model, part, zip }) {
  const results = [];
  try {
    const mappedPart = mapPartToCarPart(part);
    logger.info(`Car-Part.com [HTTP]: "${mappedPart}" (from "${part}") for ${year} ${make} ${model}`);

    // Step 1: GET homepage to find form values
    const homeHtml = await fetchPage('https://www.car-part.com/', false);
    const $home = cheerio.load(homeHtml);

    // Find year value
    let yearVal = '';
    $home('select[name="userYear"] option').each((i, el) => {
      if ($home(el).text().trim() === String(year)) yearVal = $home(el).attr('value') || String(year);
    });

    // Find make value
    let makeVal = '';
    $home('select[name="userMake"] option').each((i, el) => {
      const text = $home(el).text().trim().toUpperCase();
      if (text.includes(make.toUpperCase())) makeVal = $home(el).attr('value') || '';
    });

    // Get the form action URL
    const formAction = $home('form').attr('action') || '/cgi-bin/search.cgi';

    logger.info(`Car-Part.com: year=${yearVal}, make=${makeVal}, form=${formAction}`);

    // Step 2: Submit search — Car-Part uses GET parameters
    const searchUrl = `https://www.car-part.com${formAction}?userSearch=int&userPart=${encodeURIComponent(mappedPart)}&userYear=${yearVal || year}&userMake=${makeVal || make.toUpperCase()}&userModel=${encodeURIComponent(model.toUpperCase())}&userZip=${zip || '33407'}&userMiles=300&userInterchange=`;

    logger.info(`Car-Part.com: fetching search URL`);
    const searchHtml = await fetchPage(searchUrl, false);
    const $search = cheerio.load(searchHtml);
    const searchText = $search('body').text();

    logger.info(`Car-Part.com: search response ${searchHtml.length} chars`);

    // Step 3: Check for interchange page
    if (searchText.includes('Interchange Choices') || searchText.includes('Non-Interchange')) {
      logger.info('Car-Part.com: interchange page detected');

      // Find the form action and hidden fields on interchange page
      const intForm = $search('form').first();
      const intAction = intForm.attr('action') || formAction;

      // Look for Non-Interchange radio option value
      let nonIntValue = '';
      $search('input[type="radio"]').each((i, el) => {
        const parent = $search(el).parent().text().toUpperCase();
        const val = $search(el).attr('value') || '';
        if (parent.includes('NON-INTERCHANGE') && parent.includes('USING ONLY')) {
          nonIntValue = val;
        } else if (!nonIntValue && parent.includes('NON-INTERCHANGE')) {
          nonIntValue = val;
        }
      });

      // If no non-interchange, just grab first radio value
      if (!nonIntValue) {
        nonIntValue = $search('input[type="radio"]').first().attr('value') || '';
      }

      logger.info(`Car-Part.com: selecting interchange value: ${nonIntValue}`);

      // Get all hidden form fields
      const hiddenFields = {};
      $search('input[type="hidden"]').each((i, el) => {
        const name = $search(el).attr('name');
        const val = $search(el).attr('value') || '';
        if (name) hiddenFields[name] = val;
      });

      // Build interchange submission URL
      const intParams = new URLSearchParams(hiddenFields);
      const radioName = $search('input[type="radio"]').first().attr('name') || 'userInterchange';
      intParams.set(radioName, nonIntValue);

      const intUrl = `https://www.car-part.com${intAction}?${intParams.toString()}`;
      logger.info('Car-Part.com: submitting interchange selection');

      const resultsHtml = await fetchPage(intUrl, false);
      parseCarPartResults(cheerio.load(resultsHtml), results);
    }
    // Check if we're already on results
    else if (searchText.includes('sorted by') || searchText.includes('Dealer Info') || searchText.includes('US Price') || searchText.includes('Request_Quote')) {
      logger.info('Car-Part.com: direct results (no interchange)');
      parseCarPartResults($search, results);
    }
    else {
      logger.warn('Car-Part.com: unexpected page. Preview:', searchText.substring(0, 300));
    }

    logger.info(`Car-Part.com: ${results.length} yards found for "${mappedPart}"`);
  } catch (e) {
    logger.error('Car-Part.com error:', e.message);
  }
  return results;
}

function parseCarPartResults($, results) {
  $('table tr').each((i, row) => {
    const text = $(row).text() || '';
    if (text.length < 30) return;

    const phoneMatch = text.match(/(\d{3}[-.]?\d{3}[-.]?\d{4})/);
    if (!phoneMatch) return;

    const priceMatch = text.match(/\$([\d,]+)/);
    const distMatch = text.match(/\b(\d{1,4})\s*$/m);

    // Yard name from links
    let yardName = '';
    $(row).find('a').each((j, a) => {
      const t = $(a).text().trim();
      if (t.length > 3 && !t.includes('Request') && !t.includes('http') && !t.includes('CO2') && !yardName) yardName = t;
    });

    // Location
    const locMatch = text.match(/USA-(\w{2})\(([^)]+)\)/);
    if (!yardName && locMatch) yardName = locMatch[2];

    if (yardName || phoneMatch) {
      const priceNum = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;
      const distance = distMatch ? parseInt(distMatch[1]) : null;

      // Only include within 300 miles
      if (distance && distance > 500) return;

      results.push({
        supplier_name: 'Car-Part.com',
        yard_name: (yardName || 'Unknown Yard').substring(0, 60),
        phone: phoneMatch[1],
        listed_price: priceNum,
        condition: 'used',
        distance_miles: distance,
        in_stock: true,
        listing_url: 'https://www.car-part.com',
        notes: locMatch ? `${locMatch[2]}, ${locMatch[1]}${!priceNum ? ' — call for price' : ''}` : (!priceNum ? 'Call for price' : null),
        search_url: false,
        needs_call: true,
        has_price: !!priceNum
      });
    }
  });

  // Deduplicate by phone
  const seen = new Set();
  const unique = [];
  for (const r of results) {
    if (seen.has(r.phone)) continue;
    seen.add(r.phone);
    unique.push(r);
  }
  results.length = 0;
  unique.slice(0, 10).forEach(r => results.push(r));
}

// ══════════════════════════════════════════════
// GOOGLE SHOPPING — ScraperAPI structured endpoint
// ══════════════════════════════════════════════

async function scrapeGoogleShopping({ year, make, model, part, oem_number }) {
  const results = [];
  try {
    const q = oem_number ? `${oem_number} ${part} ${year} ${make} ${model}` : `${year} ${make} ${model} ${part}`;
    logger.info(`Google Shopping: "${q}"`);

    const url = `https://api.scraperapi.com/structured/google/shopping?api_key=${SCRAPER_API_KEY}&query=${encodeURIComponent(q)}&country_code=us`;
    const data = await fetchJSON(url);

    const items = data.shopping_results || data.results || data.organic_results || data.ads || [];
    logger.info(`Google Shopping: ${items.length} items`);

    for (const item of items.slice(0, 10)) {
      let price = null;
      if (typeof item.extracted_price === 'number') price = item.extracted_price;
      else if (item.price && typeof item.price === 'number') price = item.price;
      else if (item.price?.extracted) price = item.price.extracted;
      else if (typeof item.price === 'string') {
        const m = item.price.match(/\$?([\d,]+\.?\d*)/);
        if (m) price = parseFloat(m[1].replace(/,/g, ''));
      }
      if (!price) continue;

      results.push({
        supplier_name: item.source || item.merchant || item.store || 'Google Shopping',
        yard_name: item.source || item.merchant || item.store || 'Google Shopping',
        listing_url: extractRealUrl(item.link || item.url || item.product_link || '', q),
        listed_price: price, condition: 'new', in_stock: true,
        listing_title: (item.title || item.name || '').substring(0, 150),
        search_url: false, needs_call: false, has_price: true
      });
    }
    logger.info(`Google Shopping: ${results.length} PRICED results`);
  } catch (e) { logger.error('Google Shopping error:', e.message); }
  return results;
}

// ══════════════════════════════════════════════
// eBAY — HTML via ScraperAPI (render=true)
// ══════════════════════════════════════════════

async function scrapeEbay({ year, make, model, part }) {
  const results = [];
  try {
    const q = `${year} ${make} ${model} ${part}`;
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}&_sacat=6030&LH_BIN=1&_sop=15`;
    logger.info(`eBay [HTML+render]: "${q}"`);

    const html = await fetchPage(url, true);
    const $ = cheerio.load(html);

    $('.s-item').each((i, el) => {
      if (i >= 12) return false;
      const title = $(el).find('.s-item__title span, .s-item__title').first().text().trim();
      if (!title || title === 'Shop on eBay') return;
      const priceText = $(el).find('.s-item__price').first().text().trim();
      const pm = priceText.match(/\$?([\d,]+\.?\d*)/);
      if (!pm) return;
      const href = $(el).find('a.s-item__link').attr('href') || '';
      if (!href) return;
      const cond = $(el).find('.SECONDARY_INFO').first().text().trim();
      const ship = $(el).find('.s-item__shipping, .s-item__freeXDays').first().text().trim();
      const price = parseFloat(pm[1].replace(/,/g, ''));
      const shipCost = ship.toLowerCase().includes('free') ? 0 : (ship.match(/\$([\d.]+)/) ? parseFloat(ship.match(/\$([\d.]+)/)[1]) : null);

      results.push({
        supplier_name: 'eBay Motors', yard_name: 'eBay', listing_url: href,
        listed_price: price, shipping_cost: shipCost, total_price: price + (shipCost || 0),
        condition: cond.toLowerCase().includes('new') ? 'new' : 'used',
        in_stock: true, photos_available: true, listing_title: title.substring(0, 150),
        search_url: false, needs_call: false, has_price: true
      });
    });
    results.sort((a, b) => (a.total_price || 999999) - (b.total_price || 999999));
    logger.info(`eBay: ${results.length} priced results`);
  } catch (e) { logger.error('eBay error:', e.message); }
  return results;
}

// ══════════════════════════════════════════════
// CARPARTS.COM — render=true
// ══════════════════════════════════════════════

async function scrapeCarPartsCom({ year, make, model, part }) {
  const results = [];
  try {
    const q = `${year} ${make} ${model} ${part}`;
    logger.info(`CarParts.com [render]: "${q}"`);
    const html = await fetchPage(`https://www.carparts.com/search?q=${encodeURIComponent(q)}`, true);
    const $ = cheerio.load(html);

    // Find product links near prices
    $('a[href*="/details/"], a[href*="/product/"]').each((i, el) => {
      if (i >= 10) return false;
      const href = $(el).attr('href') || '';
      const text = $(el).text().trim();
      const parent = $(el).closest('div, li, article');
      const priceText = parent.text();
      const pm = priceText.match(/\$([\d,]+\.?\d{2})/);
      if (text.length > 10 && pm) {
        results.push({
          supplier_name: 'CarParts.com', yard_name: 'CarParts.com',
          listing_url: href.startsWith('http') ? href : `https://www.carparts.com${href}`,
          listed_price: parseFloat(pm[1].replace(/,/g, '')), condition: 'new', in_stock: true,
          listing_title: text.substring(0, 150), search_url: false, needs_call: false, has_price: true
        });
      }
    });
    logger.info(`CarParts.com: ${results.length} priced results`);
  } catch (e) { logger.error('CarParts.com error:', e.message); }
  return results;
}

// ══════════════════════════════════════════════
// CARiD — render=true
// ══════════════════════════════════════════════

async function scrapeCarId({ year, make, model, part }) {
  const results = [];
  try {
    const q = `${year} ${make} ${model} ${part}`;
    logger.info(`CARiD [render]: "${q}"`);
    const html = await fetchPage(`https://www.carid.com/search/?text=${encodeURIComponent(q)}`, true);
    const $ = cheerio.load(html);

    $('a[href*=".html"]').each((i, el) => {
      if (i >= 100) return false;
      const href = $(el).attr('href') || '';
      const title = $(el).text().trim();
      if (title.length < 10 || title.length > 200) return;
      const parent = $(el).closest('div, li, article');
      const pm = parent.text().match(/\$([\d,]+\.?\d{2})/);
      if (pm && !results.find(r => r.listing_title === title.substring(0, 150))) {
        results.push({
          supplier_name: 'CARiD', yard_name: 'CARiD',
          listing_url: href.startsWith('http') ? href : `https://www.carid.com${href}`,
          listed_price: parseFloat(pm[1].replace(/,/g, '')), condition: 'new', in_stock: true,
          listing_title: title.substring(0, 150), search_url: false, needs_call: false, has_price: true
        });
      }
    });
    logger.info(`CARiD: ${results.length} priced results`);
  } catch (e) { logger.error('CARiD error:', e.message); }
  return results;
}

// ══════════════════════════════════════════════
// PARTSGEEK — render=true
// ══════════════════════════════════════════════

async function scrapePartsGeek({ year, make, model, part }) {
  const results = [];
  try {
    const q = `${year} ${make} ${model} ${part}`;
    logger.info(`PartsGeek [render]: "${q}"`);
    const html = await fetchPage(`https://www.partsgeek.com/catalog/search/?q=${encodeURIComponent(q)}`, true);
    const $ = cheerio.load(html);

    $('a[href*="partsgeek.com"], a[href^="/"]').each((i, el) => {
      if (i >= 100) return false;
      const href = $(el).attr('href') || '';
      const title = $(el).text().trim();
      if (title.length < 10 || title.length > 200) return;
      const parent = $(el).closest('div, li, tr, article');
      const pm = parent.text().match(/\$([\d,]+\.?\d{2})/);
      if (pm && !results.find(r => r.listing_title === title.substring(0, 150))) {
        results.push({
          supplier_name: 'PartsGeek', yard_name: 'PartsGeek',
          listing_url: href.startsWith('http') ? href : `https://www.partsgeek.com${href}`,
          listed_price: parseFloat(pm[1].replace(/,/g, '')), condition: 'new', in_stock: true,
          listing_title: title.substring(0, 150), search_url: false, needs_call: false, has_price: true
        });
      }
    });
    logger.info(`PartsGeek: ${results.length} priced results`);
  } catch (e) { logger.error('PartsGeek error:', e.message); }
  return results;
}

// ══════════════════════════════════════════════
// DISPATCHER
// ══════════════════════════════════════════════

function normalizeSlug(slug) { return slug.replace(/-\d{10,}$/, ''); }

async function scrapeSupplier(supplierId, partData) {
  const { data: supplier } = await supabase.from('suppliers').select('*').eq('id', supplierId).single();
  if (!supplier || !supplier.is_active) return [];
  const slug = normalizeSlug(supplier.slug);
  if (shouldSkipSupplier(slug, partData.make)) { logger.info(`Skipping ${supplier.name} — not relevant for ${partData.make}`); return []; }

  const params = { year: partData.year, make: partData.make, model: partData.model, part: partData.part_name, oem_number: partData.oem_number || null, zip: partData.zip || '33407' };

  let results = [];
  switch (slug) {
    case 'car-part-public': results = await scrapeCarPartPublic(params); break;
    case 'ebay': results = await scrapeEbay(params); break;
    case 'carparts': results = await scrapeCarPartsCom(params); break;
    case 'carid': results = await scrapeCarId(params); break;
    case 'partsgeek': results = await scrapePartsGeek(params); break;
    case 'google-shopping': results = await scrapeGoogleShopping(params); break;
    default: results = generateSearchUrlResult(slug, supplier.name, params); break;
  }
  await delay(500);
  return results;
}

async function testSupplierLogin(supplier) {
  return { success: !supplier.requires_login, message: supplier.requires_login ? 'Login required' : 'No login needed' };
}

// No browser needed
async function getBrowser() { return null; }

module.exports = { scrapeSupplier, testSupplierLogin, getBrowser };
