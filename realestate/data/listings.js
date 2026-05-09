export const LISTINGS = [
    {
        id: 'L001', title: 'Hill Country Modern',
        address: { line1: '2348 Maple Ridge Dr', city: 'Austin', state: 'TX', zip: '78749' },
        lat: 30.2225, lng: -97.8493,
        price: 1295000, beds: 4, baths: 3, sqft: 2840,
        type: 'house', yearBuilt: 2021, daysOnMarket: 6,
        description: "A light-filled modernist retreat tucked into the Hill Country canopy. Walls of sliding glass open the great room onto a covered lanai with limestone fireplace. The chef's kitchen anchors an open plan with a 12-foot waterfall island, soft-close cabinetry, and a butler's pantry. The primary suite reads as a private wing — wood-panel ceiling, oversized walk-in, and a spa bath with steam shower. A flexible study can serve as a fifth bedroom. Energy-efficient mechanicals, owned solar, and EV-ready garage round out a home that feels current and serious.",
        features: ['Quartz waterfall island', '12-ft ceilings in great room', 'Owned solar (8.4 kW)', 'EV-ready 2-car garage', 'Smart thermostat & blinds', "Butler's pantry", 'Walk-in primary closet', 'Outdoor lanai with limestone fireplace', 'Oak hardwood floors', 'Dedicated office'],
        hoaMonthly: 0, lotSqft: 9148,
        agent: { name: 'Maya Chen', photoColor: '#ff385c' },
        heroColor: 'linear-gradient(135deg, #f8d4b8 0%, #f5b78c 50%, #e89770 100%)',
        tour3d: {
            splat: '/engine/examples/assets/splats/apartment.sog',
            mesh: '/engine/examples/assets/models/apartment.glb',
            hotspots: '/realestate/data/hotspots.js'
        }
    },
    {
        id: 'L002', title: 'East Austin Bungalow',
        address: { line1: '904 Cesar Chavez St', city: 'Austin', state: 'TX', zip: '78702' },
        lat: 30.2616, lng: -97.7245,
        price: 689000, beds: 3, baths: 2, sqft: 1620,
        type: 'house', yearBuilt: 1948, daysOnMarket: 14,
        description: 'Restored 1948 craftsman bungalow in the heart of East Austin. Original heart-pine floors, beadboard ceilings, and a wraparound porch. The kitchen has been opened to a sunny breakfast nook with built-in banquette. A detached studio in the back makes a dreamy guesthouse or music room.',
        features: ['Original heart-pine floors', 'Wraparound porch', 'Detached 280 sqft studio', 'Walk to East 6th'],
        hoaMonthly: 0, lotSqft: 5400,
        agent: { name: 'David Park', photoColor: '#5b8def' },
        heroColor: 'linear-gradient(135deg, #d8e3ce, #a3c2a0)'
    },
    {
        id: 'L003', title: 'Zilker Mid-Century',
        address: { line1: '1812 Bluebonnet Ln', city: 'Austin', state: 'TX', zip: '78704' },
        lat: 30.2589, lng: -97.7760,
        price: 1875000, beds: 4, baths: 3, sqft: 3120,
        type: 'house', yearBuilt: 1962, daysOnMarket: 22,
        description: 'A faithful mid-century restoration in coveted Zilker. Vaulted T&G ceilings, walls of glass, and a sunken living room with original floor-to-ceiling fireplace. New systems, new roof, but every period detail preserved.',
        features: ['Original sunken living room', 'Vaulted tongue-and-groove ceiling', 'Pebble pool', 'Half-acre lot'],
        hoaMonthly: 0, lotSqft: 21780,
        agent: { name: 'Renée Okafor', photoColor: '#7c4dff' },
        heroColor: 'linear-gradient(135deg, #c7e3f5, #88c5e8)'
    },
    {
        id: 'L004', title: 'Hyde Park Townhouse',
        address: { line1: '4112 Avenue G', city: 'Austin', state: 'TX', zip: '78751' },
        lat: 30.3076, lng: -97.7280,
        price: 745000, beds: 3, baths: 2, sqft: 1850,
        type: 'townhouse', yearBuilt: 2019, daysOnMarket: 4,
        description: 'Modern three-story townhouse in walkable Hyde Park. Open ground-floor great room, two bedrooms upstairs, and a private rooftop terrace with downtown skyline views.',
        features: ['Rooftop terrace with skyline view', 'Two-car attached garage', '4 blocks to Speedway shops'],
        hoaMonthly: 280, lotSqft: 1200,
        agent: { name: 'Maya Chen', photoColor: '#ff385c' },
        heroColor: 'linear-gradient(135deg, #f5d0e0, #e8a4c4)'
    },
    {
        id: 'L005', title: 'Downtown High-Rise',
        address: { line1: '301 W 5th St #2104', city: 'Austin', state: 'TX', zip: '78701' },
        lat: 30.2680, lng: -97.7480,
        price: 925000, beds: 2, baths: 2, sqft: 1280,
        type: 'condo', yearBuilt: 2017, daysOnMarket: 9,
        description: '21st-floor corner unit with floor-to-ceiling windows wrapping the southwest face. Building amenities include 24-hour concierge, rooftop pool, fitness, and dog run.',
        features: ['Floor-to-ceiling windows', '21st-floor corner', 'Rooftop pool', '24-hr concierge'],
        hoaMonthly: 945, lotSqft: 0,
        agent: { name: 'David Park', photoColor: '#5b8def' },
        heroColor: 'linear-gradient(135deg, #cdd6e0, #8b9aac)'
    },
    {
        id: 'L006', title: 'Tarrytown Estate',
        address: { line1: '2900 W 35th St', city: 'Austin', state: 'TX', zip: '78703' },
        lat: 30.3023, lng: -97.7660,
        price: 3850000, beds: 5, baths: 5, sqft: 5640,
        type: 'house', yearBuilt: 2008, daysOnMarket: 38,
        description: "Stately Tarrytown estate on a wooded acre. Formal living and dining, chef's kitchen, paneled study, and a primary wing on the main floor. Pool, pool house, and mature live oaks.",
        features: ['Wooded 1.04 acre lot', 'Pool + pool house', 'Wine room', 'Three-car garage'],
        hoaMonthly: 0, lotSqft: 45302,
        agent: { name: 'Renée Okafor', photoColor: '#7c4dff' },
        heroColor: 'linear-gradient(135deg, #f0e2c8, #d4b88c)'
    },
    {
        id: 'L007', title: 'South Lamar Loft',
        address: { line1: '1705 S Lamar Blvd #312', city: 'Austin', state: 'TX', zip: '78704' },
        lat: 30.2519, lng: -97.7720,
        price: 525000, beds: 1, baths: 1, sqft: 920,
        type: 'condo', yearBuilt: 2014, daysOnMarket: 11,
        description: 'Industrial loft with exposed steel, polished concrete, and 14-foot ceilings. Two-block walk to Lamar restaurants and music venues.',
        features: ['14-ft exposed steel ceilings', 'Polished concrete floors', 'Walk to Continental Club'],
        hoaMonthly: 410, lotSqft: 0,
        agent: { name: 'Maya Chen', photoColor: '#ff385c' },
        heroColor: 'linear-gradient(135deg, #d8d4c8, #a89c84)'
    },
    {
        id: 'L008', title: 'Mueller Family Home',
        address: { line1: '4506 Berkman Dr', city: 'Austin', state: 'TX', zip: '78723' },
        lat: 30.3036, lng: -97.7022,
        price: 875000, beds: 4, baths: 3, sqft: 2410,
        type: 'house', yearBuilt: 2015, daysOnMarket: 18,
        description: 'New-urbanist Mueller home steps from the lake park and weekend farmers market. Front porch, mudroom, family-room-centered floor plan, and finished bonus room above the garage.',
        features: ['Walk to Mueller Lake Park', 'Bonus room over garage', 'Front porch + alley garage'],
        hoaMonthly: 65, lotSqft: 4200,
        agent: { name: 'David Park', photoColor: '#5b8def' },
        heroColor: 'linear-gradient(135deg, #c2dec0, #84b482)'
    },
    {
        id: 'L009', title: 'Barton Hills Cottage',
        address: { line1: '2210 Inwood Pl', city: 'Austin', state: 'TX', zip: '78704' },
        lat: 30.2415, lng: -97.7900,
        price: 615000, beds: 2, baths: 1, sqft: 1180,
        type: 'house', yearBuilt: 1956, daysOnMarket: 7,
        description: 'Charming 1950s cottage on a wooded lot in Barton Hills. Updated kitchen, screened porch, and a backyard that disappears into the greenbelt.',
        features: ['Backs to greenbelt', 'Screened porch', 'Mature oaks'],
        hoaMonthly: 0, lotSqft: 7800,
        agent: { name: 'Renée Okafor', photoColor: '#7c4dff' },
        heroColor: 'linear-gradient(135deg, #d4d8b4, #a4ad7b)'
    },
    {
        id: 'L010', title: 'Domain Northside Penthouse',
        address: { line1: '3101 Kramer Ln #PH3', city: 'Austin', state: 'TX', zip: '78758' },
        lat: 30.3963, lng: -97.7240,
        price: 2150000, beds: 3, baths: 3, sqft: 2680,
        type: 'condo', yearBuilt: 2020, daysOnMarket: 28,
        description: "Penthouse with 1,200 sqft of private terrace overlooking the Domain. Chef's kitchen by Bulthaup, primary suite with dressing room, building amenities include lap pool and lounge.",
        features: ['1,200 sqft private terrace', 'Bulthaup kitchen', 'Two parking spots', 'Lap pool'],
        hoaMonthly: 1380, lotSqft: 0,
        agent: { name: 'Maya Chen', photoColor: '#ff385c' },
        heroColor: 'linear-gradient(135deg, #c8d4e0, #8a9fb8)'
    },
    {
        id: 'L011', title: 'Travis Heights Bungalow',
        address: { line1: '1311 Mission Ridge', city: 'Austin', state: 'TX', zip: '78704' },
        lat: 30.2495, lng: -97.7470,
        price: 1095000, beds: 3, baths: 2, sqft: 1980,
        type: 'house', yearBuilt: 1939, daysOnMarket: 12,
        description: 'Travis Heights bungalow with thoughtful renovations. Original tile bath, weathered pine paneling in the den, and a deep front porch that catches the south breeze.',
        features: ['Original tile bath', 'Front porch with hill views', 'Walk to South Congress'],
        hoaMonthly: 0, lotSqft: 6600,
        agent: { name: 'David Park', photoColor: '#5b8def' },
        heroColor: 'linear-gradient(135deg, #e8d4c0, #c8a884)'
    },
    {
        id: 'L012', title: 'Westlake Hilltop',
        address: { line1: '4408 Westlake Dr', city: 'Austin', state: 'TX', zip: '78746' },
        lat: 30.3140, lng: -97.8290,
        price: 2640000, beds: 5, baths: 4, sqft: 4120,
        type: 'house', yearBuilt: 2013, daysOnMarket: 45,
        description: 'Westlake hilltop with western lake views. Open great room, screened-in outdoor living, infinity pool with lake view, and a separate two-bedroom guest casita.',
        features: ['Lake views', 'Infinity pool', 'Two-bedroom guest casita', 'Three-car garage'],
        hoaMonthly: 0, lotSqft: 32670,
        agent: { name: 'Renée Okafor', photoColor: '#7c4dff' },
        heroColor: 'linear-gradient(135deg, #c2d8e8, #7ea4c0)'
    }
];

export function findListing(id) {
    return LISTINGS.find(l => l.id === id) || null;
}
