
import React, { useState, useMemo, useEffect } from 'react';

export type EntityType = 'any' | 'sole_proprietor' | 'llc' | 'pvt_ltd' | 'public_ltd' | 'partnership' | 'corporation' | 'non_profit' | 'trust' | 'franchise';
export type EmployeeRange = 'any' | '1-10' | '11-50' | '51-200' | '201-500' | '501+';
export type FundingStage = 'any' | 'seed' | 'series_a' | 'series_b' | 'series_c' | 'pre_ipo' | 'public';

export interface SearchFilters {
  linkedin: 'any' | 'required' | 'excluded';
  twitterRequired: boolean;
  instagramRequired: boolean;
  youtubeRequired: boolean;
  facebookRequired: boolean;
  websiteRequired: boolean;
  phoneRequired: boolean;
  localOnly: boolean;
  independentOnly: boolean;
  physicalStorefront: boolean;
  entityType: EntityType;
  employeeCountRange: EmployeeRange;
  fundingStage: FundingStage;
  leadCount: number;
  intentSignal: string;
  targetRole: string;
}

interface SearchSectionProps {
  onSearch: () => void;
  isLoading: boolean;
  mode: 'sidebar' | 'matrix';
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  location: string;
  setLocation: React.Dispatch<React.SetStateAction<string>>;
  country: string;
  setCountry: React.Dispatch<React.SetStateAction<string>>;
  area: string;
  setArea: React.Dispatch<React.SetStateAction<string>>;
  radius: number;
  setRadius: React.Dispatch<React.SetStateAction<number>>;
  filters: SearchFilters;
  setFilters: React.Dispatch<React.SetStateAction<SearchFilters>>;
}

// Global Geographic Matrix: 20 Countries, 20 Cities each, 20 Areas each
const LOCATION_HIERARCHY: Record<string, Record<string, string[]>> = {
  'United States': {
    'New York': ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island', 'Midtown', 'Upper East Side', 'Upper West Side', 'SoHo', 'Chelsea', 'Financial District', 'Williamsburg', 'Astoria', 'Long Island City', 'DUMBO', 'Greenwich Village', 'Tribeca', 'Harlem', 'Flushing', 'Bushwick'],
    'Los Angeles': ['Downtown LA', 'Santa Monica', 'Beverly Hills', 'Hollywood', 'Venice', 'Silver Lake', 'Culver City', 'Westwood', 'Pasadena', 'Burbank', 'Glendale', 'Long Beach', 'Malibu', 'Encino', 'Sherman Oaks', 'Studio City', 'Koreatown', 'Little Tokyo', 'Echo Park', 'Bel Air'],
    'Chicago': ['The Loop', 'River North', 'West Loop', 'Lincoln Park', 'Wicker Park', 'Logan Square', 'Gold Coast', 'Streeterville', 'Lakeview', 'Old Town', 'South Loop', 'Bucktown', 'Pilsen', 'Hyde Park', 'Andersonville', 'Ravenswood', 'Rogers Park', 'Albany Park', 'Uptown', 'Humboldt Park'],
    'Houston': ['Downtown', 'Midtown', 'The Heights', 'Montrose', 'River Oaks', 'Galleria', 'Museum District', 'Medical Center', 'West University', 'Memorial', 'Energy Corridor', 'Sugar Land', 'The Woodlands', 'Katy', 'Pearland', 'Cypress', 'Spring', 'Humble', 'Clear Lake', 'Kingwood'],
    'Phoenix': ['Downtown', 'Arcadia', 'Biltmore', 'North Central', 'Desert Ridge', 'Ahwatukee', 'Encanto', 'Maryvale', 'Paradise Valley', 'Deer Valley', 'South Mountain', 'Camelback East', 'Central City', 'Sunnyslope', 'Moon Valley', 'Anthem', 'Lavine', 'Alhambra', 'Estrella', 'Fireside'],
    'Philadelphia': ['Center City', 'Old City', 'Society Hill', 'Rittenhouse Square', 'University City', 'Fishtown', 'Northern Liberties', 'Fairmount', 'Manayunk', 'Chestnut Hill', 'South Philly', 'Passyunk Square', 'Graduate Hospital', 'Queen Village', 'Italian Market', 'Point Breeze', 'Brewerytown', 'Strawberry Mansion', 'Germantown', 'East Falls'],
    'San Antonio': ['Downtown', 'The Pearl', 'King William', 'Alamo Heights', 'Stone Oak', 'Medical Center', 'Northwest Side', 'Far West Side', 'South Side', 'East Side', 'Monte Vista', 'Olmos Park', 'Terrell Hills', 'Brooks City Base', 'Rim/La Cantera', 'Shavano Park', 'Leon Valley', 'Windcrest', 'Helotes', 'Hollywood Park'],
    'San Diego': ['Gaslamp Quarter', 'Little Italy', 'North Park', 'La Jolla', 'Pacific Beach', 'Ocean Beach', 'Hillcrest', 'East Village', 'Mission Hills', 'Point Loma', 'Coronado', 'Del Mar', 'Encinitas', 'Carlsbad', 'Miramar', 'Kearny Mesa', 'Mission Valley', 'Chula Vista', 'National City', 'Solana Beach'],
    'Dallas': ['Uptown', 'Downtown', 'Deep Ellum', 'Highland Park', 'University Park', 'Oak Lawn', 'Preston Hollow', 'Lower Greenville', 'Knox-Henderson', 'Victory Park', 'Design District', 'Trinity Groves', 'Lake Highlands', 'Far North Dallas', 'Pleasant Grove', 'Oak Cliff', 'Kessler Park', 'Bishop Arts', 'M-Streets', 'Lakewood'],
    'San Jose': ['Downtown', 'Willow Glen', 'Rose Garden', 'West San Jose', 'North San Jose', 'Almaden Valley', 'Evergreen', 'Silver Creek', 'Berryessa', 'Santa Teresa', 'Cambrian Park', 'Japantown', 'Santana Row', 'Winchester', 'Naglee Park', 'Burbank', 'Edenvale', 'Seven Trees', 'Little Portugal', 'Alum Rock'],
    'Austin': ['Downtown', 'South Congress', 'East Austin', 'West Lake Hills', 'North Loop', 'Mueller', 'Rainey Street', 'Zilker', 'Barton Hills', 'Clarksville', 'Tarrytown', 'Hyde Park', 'Brentwood', 'Allandale', 'Crestview', 'Windsor Park', 'Cherrywood', 'Bouldin Creek', 'Travis Heights', 'The Domain'],
    'Jacksonville': ['Downtown', 'San Marco', 'Riverside', 'Avondale', 'Springfield', 'Ortega', 'Southside', 'Northside', 'Westside', 'Mandarin', 'Beaches', 'Pont Vedra', 'Nocatee', 'Deerwood', 'Brooklyn', 'Murray Hill', 'Arlington', 'Oceanway', 'Dinsmore', 'Greenland'],
    'Fort Worth': ['Downtown', 'Sundance Square', 'Near Southside', 'Cultural District', 'Stockyards', 'TCU Area', 'Tanglewood', 'Westover Hills', 'Fairmount', 'Mistletoe Heights', 'Northside', 'Wedgwood', 'Ridglea', 'Oakhurst', 'Handley', 'Summerfields', 'Park Hill', 'Rivercrest', 'Arlington Heights', 'Alamo Heights'],
    'Columbus': ['Short North', 'German Village', 'Victorian Village', 'Italian Village', 'Olde Towne East', 'University District', 'Clintonville', 'Grandview Heights', 'Upper Arlington', 'Bexley', 'Worthington', 'Dublin', 'Westerville', 'New Albany', 'Gahanna', 'Hilliard', 'Pickerington', 'Franklinton', 'Discovery District', 'Arena District'],
    'Charlotte': ['Uptown', 'South End', 'NoDa', 'Dilworth', 'Myers Park', 'Elizabeth', 'Plaza Midwood', 'Ballantyne', 'South Park', 'Cherry', 'Wesley Heights', 'FreeMoreWest', 'University City', 'Steele Creek', 'Starmount', 'Cotswold', 'Barclay Downs', 'Derita', 'Biddleville', 'Wilmore'],
    'San Francisco': ['Financial District', 'SoMa', 'Mission District', 'Nob Hill', 'Pacific Heights', 'Marina', 'North Beach', 'Castro', 'Haight-Ashbury', 'Richmond', 'Sunset', 'Potrero Hill', 'Dogpatch', 'Hayes Valley', 'Noe Valley', 'Presidio', 'Russian Hill', 'Chinatown', 'Twin Peaks', 'Bernal Heights'],
    'Indianapolis': ['Downtown', 'Mass Ave', 'Fountain Square', 'Broad Ripple', 'Fletcher Place', 'Lockerbie Square', 'Old Northside', 'Herron-Morton', 'Meridian-Kessler', 'Irvington', 'Butler-Tarkington', 'Broad Ripple', 'Fishers', 'Carmel', 'Zionsville', 'Greenwood', 'Avon', 'Noblesville', 'Speedway', 'Lawrence'],
    'Seattle': ['Downtown', 'Capitol Hill', 'Ballard', 'Fremont', 'Queen Anne', 'South Lake Union', 'Belltown', 'First Hill', 'Pioneer Square', 'Wallingford', 'Green Lake', 'West Seattle', 'Magnolia', 'Columbia City', 'Beacon Hill', 'University District', 'Rainier Valley', 'Northgate', 'Central District', 'Madrona'],
    'Denver': ['LoDo', 'RiNo', 'LoHi', 'Capitol Hill', 'Cherry Creek', 'Washington Park', 'Highlands', 'Baker', 'Five Points', 'Colfax', 'Stapleton', 'Park Hill', 'Hampden', 'Montbello', 'Green Valley Ranch', 'South Broadway', 'Sloans Lake', 'Platt Park', 'Congress Park', 'Uptown'],
    'Washington DC': ['Georgetown', 'Adams Morgan', 'Capitol Hill', 'Foggy Bottom', 'Dupont Circle', 'Logan Circle', 'Penn Quarter', 'Mount Vernon Square', 'Shaw', 'U Street', 'Columbia Heights', 'Petworth', 'Navy Yard', 'Southwest Waterfront', 'Woodley Park', 'Cleveland Park', 'Tenleytown', 'Brookland', 'Anacostia', 'H Street Corridor']
  },
  'United Kingdom': {
    'London': ['Canary Wharf', 'Soho', 'Westminster', 'Tech City', 'City of London', 'Mayfair', 'Shoreditch', 'Kensington', 'Chelsea', 'Islington', 'Camden', 'Greenwich', 'Paddington', 'Notting Hill', 'Brixton', 'Hampstead', 'Fulham', 'Wimbledon', 'Clapham', 'Stratford'],
    'Birmingham': ['Colmore Row', 'Digbeth', 'Jewellery Quarter', 'Edgbaston', 'Moseley', 'Sutton Coldfield', 'Solihull', 'Harborne', 'Selly Oak', 'Bournville', 'Kings Heath', 'Aston', 'Handsworth', 'Ladywood', 'Erdington', 'Northfield', 'Yardley', 'Acocks Green', 'Longbridge', 'Perry Barr'],
    'Manchester': ['Spinningfields', 'Northern Quarter', 'MediaCityUK', 'Deansgate', 'Ancoats', 'Castlefield', 'Didsbury', 'Chorlton', 'Salford Quays', 'Oxford Road', 'Piccadilly', 'Victoria', 'Rusholme', 'Whalley Range', 'Withington', 'Hulme', 'Cheetham Hill', 'Prestwich', 'Altrincham', 'Sale'],
    'Glasgow': ['West End', 'Merchant City', 'Finnieston', 'Blythswood', 'Dennistoun', 'Shawlands', 'Gorbals', 'Partick', 'Hillhead', 'Kelvinside', 'Bearsden', 'Milngavie', 'Giffnock', 'Newton Mearns', 'Clarkston', 'Pollokshields', 'Ibrox', 'Parkhead', 'Shettleston', 'Baillieston'],
    'Liverpool': ['City Centre', 'Everton', 'Anfield', 'Crosby', 'Aigburth', 'Woolton', 'Childwall', 'Speke', 'Garston', 'Toxteth', 'West Derby', 'Kirkby', 'Walton', 'Bootle', 'Waterloo', 'Sefton Park', 'Lark Lane', 'Baltic Triangle', 'Ropewalks', 'Georgian Quarter'],
    'Bristol': ['Clifton', 'Redland', 'Cotham', 'Montpelier', 'St Pauls', 'St Werburghs', 'Easton', 'Bedminster', 'Southville', 'Totterdown', 'Knowle', 'Brislington', 'Henleaze', 'Westbury on Trym', 'Horfield', 'Bishopston', 'St George', 'Fishponds', 'Avonmouth', 'Shirehampton'],
    'Sheffield': ['City Centre', 'Ecclesall', 'Heeley', 'Meersbrook', 'Nether Edge', 'Dore', 'Totley', 'Fulwood', 'Ranmoor', 'Crosspool', 'Walkley', 'Crookes', 'Hillsborough', 'Attercliffe', 'Burngreave', 'Darnall', 'Handsworth', 'Mosborough', 'Beighton', 'Stannington'],
    'Leeds': ['City Centre', 'Headingley', 'Chapel Allerton', 'Roundhay', 'Horsforth', 'Kirkstall', 'Meanwood', 'Burley', 'Holbeck', 'Hunslet', 'Beeston', 'Armley', 'Bramley', 'Pudsey', 'Farsley', 'Guiseley', 'Otley', 'Morley', 'Rothwell', 'Garforth'],
    'Edinburgh': ['Old Town', 'New Town', 'Stockbridge', 'Leith', 'Morningside', 'West End', 'Bruntsfield', 'Portobello', 'Corstorphine', 'Marchmont', 'Haymarket', 'Holyrood', 'Fountainbridge', 'Southside', 'Gorgie', 'Dalry', 'Tollcross', 'Newington', 'Liberton', 'Grange'],
    'Leicester': ['City Centre', 'Clarendon Park', 'Aylestone', 'Braunstone', 'Belgrave', 'Evington', 'Humberstone', 'Knighton', 'Oadby', 'Wigston', 'Thurmaston', 'Birstall', 'Glenfield', 'Leicester Forest East', 'Groby', 'Anstey', 'Ratby', 'Desford', 'Blaby', 'Narborough'],
    'Coventry': ['City Centre', 'Earlsdon', 'Allesley', 'Canley', 'Tile Hill', 'Eastern Green', 'Coundon', 'Radford', 'Holbrooks', 'Foleshill', 'Wyken', 'Walsgrave', 'Binley', 'Willenhall', 'Cheylesmore', 'Stivichall', 'Finham', 'Green Lane', 'Gibbet Hill', 'Kenilworth'],
    'Bradford': ['City Centre', 'Manningham', 'Heaton', 'Shipley', 'Saltaire', 'Baildon', 'Bingley', 'Keighley', 'Ilkley', 'Thornton', 'Queensbury', 'Clayton', 'Wibsey', 'Low Moor', 'Wyke', 'Holme Wood', 'Tong', 'Thackley', 'Idle', 'Eccleshill'],
    'Cardiff': ['City Centre', 'Canton', 'Roath', 'Cathays', 'Penylan', 'Lakeside', 'Cyncoed', 'Lisvane', 'Radyr', 'Llandaff', 'Whitchurch', 'Heath', 'Pontcanna', 'Butetown', 'Grangetown', 'Leckwith', 'Ely', 'Fairwater', 'Pentwyn', 'Llanishen'],
    'Belfast': ['City Centre', 'Queens Quarter', 'Titanic Quarter', 'Gaeltacht Quarter', 'Cathedral Quarter', 'Lisburn Road', 'Malone Road', 'Stranmillis', 'Ormeau Road', 'Ravenhill', 'Cregagh', 'Castlereagh', 'Dundonald', 'Holywood', 'Bangor', 'Newtownards', 'Carrickfergus', 'Larne', 'Antrim', 'Ballymena'],
    'Nottingham': ['City Centre', 'The Lace Market', 'Hockley', 'Sneinton', 'The Park', 'Wollaton', 'Lenton', 'Radford', 'Hyson Green', 'Basford', 'Bulwell', 'Bestwood', 'Sherwood', 'Arnold', 'Carlton', 'Gedling', 'West Bridgford', 'Beeston', 'Long Eaton', 'Ilkeston'],
    'Kingston upon Hull': ['City Centre', 'Old Town', 'Marina', 'Avenues', 'Newland Park', 'Beverley Road', 'Anlaby Road', 'Hessle Road', 'Holderness Road', 'Bransholme', 'Orchard Park', 'Sutton', 'Kingswood', 'Anlaby', 'Willerby', 'Kirk Ella', 'Cottngham', 'Beverley', 'Hedon', 'Bilton'],
    'Newcastle': ['City Centre', 'Jesmond', 'Gosforth', 'Heaton', 'Byker', 'Walker', 'Benwell', 'Fenham', 'Westerhope', 'Ponteland', 'Darras Hall', 'Whickham', 'Gateshead', 'Low Fell', 'Team Valley', 'Birtley', 'Washington', 'Sunderland', 'South Shields', 'North Shields'],
    'Stoke-on-Trent': ['Hanley', 'Burslem', 'Tunstall', 'Longton', 'Fenton', 'Stoke', 'Newcastle-under-Lyme', 'Kidsgrove', 'Biddulph', 'Leek', 'Stone', 'Cheadle', 'Uttoxeter', 'Stafford', 'Crewe', 'Nantwich', 'Sandbach', 'Alsager', 'Congleton', 'Macclesfield'],
    'Southampton': ['City Centre', 'Ocean Village', 'Shirley', 'Portswood', 'Swaythling', 'Bitterne', 'Woolston', 'Netley', 'Hamble', 'Bursledon', 'Hedge End', 'West End', 'Eastleigh', 'Chandlers Ford', 'Romsey', 'Hythe', 'Totton', 'Lyndhurst', 'Winchester', 'Fareham'],
    'Reading': ['Town Centre', 'Caversham', 'Earley', 'Woodley', 'Tilehurst', 'Whitley', 'Southcote', 'Coley', 'Calcot', 'Theale', 'Pangbourne', 'Sonning', 'Wokingham', 'Bracknell', 'Henley-on-Thames', 'Maidenhead', 'Slough', 'Windsor', 'Newbury', 'Thatcham']
  },
  'Pakistan': {
    'Karachi': ['DHA Phase 1-8', 'Clifton', 'I.I. Chundrigar', 'Shahrah-e-Faisal', 'Korangi Industrial', 'PECHS', 'North Nazimabad', 'Gulshan-e-Iqbal', 'Saddar', 'SITE Area', 'Bahria Town', 'Malir Cantt', 'KDA Scheme 1', 'Garden East', 'Defense View', 'Gulistan-e-Johar', 'Nazimabad', 'Federal B Area', 'Karsaz', 'Tariq Road'],
    'Lahore': ['Gulberg I-V', 'DHA Phase 1-9', 'Johar Town', 'Model Town', 'Mall Road', 'Bahria Town', 'Cavalry Ground', 'Garden Town', 'Faisal Town', 'Wapda Town', 'Valencia', 'Samanabad', 'Shadman', 'Defense Raya', 'Allama Iqbal Town', 'Township', 'Gulshan-e-Ravi', 'Raiwind Road', 'Misri Shah', 'Badami Bagh'],
    'Islamabad': ['Blue Area', 'F-6', 'F-7', 'F-8', 'F-10', 'F-11', 'G-6', 'G-7', 'G-8', 'G-9', 'G-10', 'G-11', 'E-7', 'I-8', 'DHA Phase 2', 'Bahria Enclave', 'Gulberg Greens', 'Sector H', 'Diplomatic Enclave', 'Bani Gala'],
    'Faisalabad': ['D Ground', 'Canal Road', 'Kohinoor City', 'People\'s Colony', 'Madina Town', 'Sargodha Road', 'Jaranwala Road', 'Samanabad', 'Gulberg', 'Faisal Lane', 'Millat Road', 'Batala Colony', 'Civil Lines', 'Gatwala', 'Ghulam Muhammad Abad', 'Factory Area', 'Clock Tower', 'Khurrianwala', 'Satiana Road', 'Amin Town'],
    'Rawalpindi': ['Saddar', 'Satellite Town', 'Bahria Phase 1-8', 'Westridge', 'Chaklal Scheme', 'Gulraiz', 'Adyala Road', 'Peshawar Road', 'Commercial Market', 'Media Town', 'Askari 14', 'Shamsabad', 'Tench Bhata', 'Lalkurti', 'Dhoke Khabba', 'Raja Bazar', 'Warid Colony', 'Bahria Orchard', 'Top City', 'Airport Road'],
    'Multan': ['Bosan Road', 'Gulgasht Colony', 'Cantt Area', 'Shamsabad', 'Wapda Town', 'Model Town', 'Shah Rukn-e-Alam', 'New Multan', 'Timber Market', 'Industrial Estate', 'Hussain Agahi', 'Chowk Shaheedan', 'Nishtar Road', 'Mall Plaza', 'Officers Colony', 'Zakariya Town', 'Sher Shah Road', 'Mumtazabad', 'Dream Gardens', 'Saddar'],
    'Peshawar': ['Hayatabad', 'University Road', 'Cantt', 'Ring Road', 'Town Area', 'Warsak Road', 'Gulbahar', 'Dalazak Road', 'GT Road', 'Shami Road', 'Dabgari Gardens', 'Sadar Bazar', 'Qissa Khwani', 'Industrial Estate Hayatabad', 'Karkhano Market', 'Deans Trade Center', 'Khyber Bazar', 'Pabbi', 'Board Bazar', 'Faqirabad'],
    'Quetta': ['Jinnah Road', 'Zarghoon Road', 'Cantt', 'Samanabad', 'Model Town', 'Shahbaz Town', 'Satellite Town', 'Airport Road', 'Gulistan Road', 'Sariab Road', 'Alamdar Road', 'Brewery Road', 'Double Road', 'Suraj Ganj Bazar', 'Meezan Chowk', 'Railway Colony', 'Pashtunabad', 'Kansi Road', 'Nawan Killi', 'Samungli Road'],
    'Gujranwala': ['Satellite Town', 'Model Town', 'G.T. Road', 'DC Colony', 'Citi Housing', 'Garden Town', 'People\'s Colony', 'Wapda Town', 'Civil Lines', 'Sialkot Road', 'Pasrur Road', 'Nowshera Road', 'Industrial Estate', 'Cloth Market', 'Lohari Gate', 'Shaheenabad', 'Kangni Wala', 'Ferozewala', 'Nandipur', 'Awan Chowk'],
    'Sialkot': ['Kashmir Road', 'Defense Road', 'Cantt', 'Sialkot City', 'Paris Road', 'Model Town', 'Sambrial', 'Daska Road', 'Small Industrial Estate', 'Puran Nagar', 'Mubarak Pura', 'Fateh Garh', 'Neeka Pura', 'Rang Pura', 'Haji Pura', 'Adalat Garh', 'Ugoki', 'Sahowala', 'Gohad Pur', 'Pakka Garah'],
    'Bahawalpur': ['Cantt', 'Model Town', 'Satellite Town', 'Noor Mahal Road', 'Circular Road', 'One Unit Staff Colony', 'Welcome Colony', 'Medical Colony', 'Dubai Chowk', 'Gulberg', 'Cheema Town', 'Yazman Road', 'Industrial Area', 'Commercial Area', 'Ganesh Garden', 'Bahria', 'Saddar', 'Airport Road', 'University Road', 'Bindra Colony'],
    'Sargodha': ['Satellite Town', 'Model Town', 'University Road', 'Club Road', 'Cantt Area', 'Fatima Jinnah Road', 'Kutchery Road', 'Faisalabad Road', 'Lahore Road', 'Sillanwali Road', 'Small Industrial Estate', 'Zafarullah Chowk', 'Sher Zaman Town', 'Ghouri Town', 'Al-Falah Town', 'Rehman Villas', 'Eden Garden', 'Gulberg', 'Aziz Bhatti Town', 'Civil Lines'],
    'Sukkur': ['Barrage Colony', 'Military Road', 'Workshop Road', 'Shikarpur Road', 'Minara Road', 'Golimar', 'New Pind', 'Society Area', 'SITE Area', 'Hira Medical Center Area', 'Clock Tower', 'Bunder Road', 'Frere Road', 'Gharibabad', 'Nisar Ahmed Siddiqui Road', 'Shia Road', 'Airport Road', 'Lab-e-Mehran', 'Queens Road', 'Station Road'],
    'Jhang': ['City Area', 'Saddar Area', 'Satellite Town', 'Civil Lines', 'College Road', 'Toba Road', 'Chiniot Road', 'Sargodha Road', 'Faisalabad Road', 'Yousaf Colony', 'Ayub Chowk', 'Burj Mandi', 'Kot Wali', 'Shah Kabir', 'Gojra Road', 'Industrial Estate', 'Commercial Market', 'Model Town', 'Wapda Town', 'D-Ground'],
    'Larkana': ['City Centre', 'Civil Lines', 'VIP Road', 'Airport Road', 'Kennedy Market', 'Shahi Bazar', 'Lahori Mohalla', 'Miro Khan Road', 'Raza Shah Kabir', 'Sachal Sarmast Road', 'Mohenjo Daro Road', 'Industrial Area', 'Police Lines', 'Wapda Colony', 'Residency Area', 'Sachal Colony', 'Ghareebabad', 'Bakrani Road', 'Station Road', 'Bund Road'],
    'Sheikhupura': ['Housing Colony', 'Civil Lines', 'Sargodha Road', 'Faisalabad Road', 'Lahore Road', 'Muridke Road', 'Industrial Estate', 'Model Town', 'Satellite Town', 'Railway Road', 'Jinnah Park Area', 'Gojra Area', 'Sharqpur Road', 'Nankana Road', 'Mandiala Area', 'Qila Area', 'Ferozewala', 'Kala Shah Kaku', 'Rachna Town', 'City Centre'],
    'Rahim Yar Khan': ['City Centre', 'Model Town', 'Satellite Town', 'Sadiqabad Road', 'S Khanpur Road', 'Mianwali Road', 'Industrial Estate', 'Medical College Area', 'Thal Area', 'Gulberg', 'Garden Town', 'Officers Colony', 'Club Road', 'Circular Road', 'Canal Road', 'Station Road', 'Airport Road', 'Shahi Road', 'Saddar', 'Commercial Area'],
    'Mardan': ['City Centre', 'Cantt Area', 'Saddar', 'Malakand Road', 'Swabi Road', 'Nowshera Road', 'Charsadda Road', 'Industrial Area', 'Bank Road', 'College Road', 'Judge Bazar', 'Hoti', 'Par Hoti', 'Baghdada', 'Shamsi Road', 'Gulberg', 'Sheikh Maltoon Town', 'Duroosh Khel', 'Mardan Enclave', 'New City'],
    'Gujrat': ['City Centre', 'Civil Lines', 'Sargodha Road', 'Sialkot Road', 'Bhimber Road', 'Industrial Area', 'Furniture Market Area', 'Fawara Chowk', 'Railway Road', 'Model Town', 'Satellite Town', 'Gulberg', 'Marghzar Colony', 'G.T. Road', 'Daulat Nagar', 'Dingah Road', 'Lalamusa Road', 'Karianwala Road', 'Jalalpur Jattan Road', 'Mian Road'],
    'Kasur': ['City Centre', 'Lahore Road', 'Ferozepur Road', 'Deepalpur Road', 'Raiwind Road', 'Industrial Estate', 'Model Town', 'Gulberg', 'Civil Lines', 'Saddar', 'Steel Market Area', 'Ganda Singh Wala', 'Mustafabad', 'Kot Radha Kishan', 'Pattoki Road', 'Chunian Road', 'Kutchery Road', 'Station Road', 'Bazar Area', 'Niazi Town']
  },
  'Saudi Arabia': {
    'Riyadh': ['Olaya', 'Al Malaz', 'Diplomatic Quarter', 'Al Yasmin', 'Al Nakheel', 'KAFD', 'Al Murabba', 'Al Sulimaniyah', 'Al Sahafah', 'Al Aqiq', 'Al Wadi', 'Al Ghadir', 'Al Wurud', 'Al Mursalat', 'Al Nuzha', 'Al Taawun', 'Al Izdihar', 'Al Mughrizat', 'Al Qairawan', 'Al Narjis'],
    'Jeddah': ['Al Tahlia', 'Al Hamra', 'Al Khalidiyah', 'Al Balad', 'Obhur Al-Shamaliyah', 'Al Shatie', 'Al Rawdah', 'Al Zahra', 'Al Salamah', 'Al Naeem', 'Al Muhammadiyah', 'Al Basateen', 'Al Safa', 'Al Marwah', 'Al Fayhaa', 'Al Naseem', 'Al Rehab', 'Al Aziziyah', 'Al Kandarah', 'Al Baghdadiyah'],
    'Dammam': ['Ash Shati', 'Al Adamah', 'Al Faisaliyah', 'Dammam 2nd Industrial', 'Al Jalawiyah', 'Al Aziziyah', 'Al Hamra', 'Al Badi', 'Al Anoud', 'Al Zahur', 'Al Khaleej', 'Al Rabia', 'Al Manar', 'Al Shula', 'Al Nakheel', 'Al Qadisiyah', 'Al Safa', 'Al Rawabi', 'Al Uhud', 'Al Nour'],
    'Al Khobar': ['Al Yarmouk', 'Al Bandariyah', 'Al Rakka', 'Dhahran', 'Al Corniche', 'Al Hizam Al Akhdar', 'Al Hizam Al Zahabi', 'Al Khobar Al Shamalia', 'Al Khobar Al Janubia', 'Thuqbah', 'Al Jisr', 'Al Aziziyah', 'Al Rawabi', 'Al Ulaya', 'Al Jawharah', 'Al Safa', 'Al Murjan', 'Al Kousar', 'Al Sadafa', 'Mubarakia'],
    'Makkah': ['Ajyad', 'Al Aziziyah', 'Al Kakiyah', 'Al Shubaikah', 'Al Rasaifah', 'Al Hindawiyah', 'Al Zahir', 'Al Mansur', 'Al Hajlah', 'Misfalah', 'Kudai', 'Al Khalidiyah', 'Al Shawqiyah', 'Al Awali', 'Al Nuzha', 'Al Utaybiyyah', 'Al Tanim', 'Jabal al-Nur', 'Shar Mansur', 'Mina'],
    'Madinah': ['Al Haram', 'Al Central Area', 'Al Khalidiyah', 'Al Qiblatayn', 'Al Arid', 'Al Mabuth', 'Al Baqi', 'Quba', 'As Sih', 'Al Anbariyah', 'Al Rayan', 'Al Aziziyah', 'Al Jumuah', 'Al Hadrah', 'Al Masani', 'Al Iskan', 'Uhud', 'Al Zahrah', 'Prince Nayef', 'Sultanah'],
    'Abha': ['Al Sharaf', 'Al Rabwah', 'Al Khalidiyah', 'Al Arin', 'Al Aziziyah', 'Abha Al Jadidah', 'Al Mansak', 'Al Mowathafien', 'Al Manhal', 'Shamasan', 'Al Andalus', 'Al Ward', 'Al Naseem', 'Al Faisaliyah', 'Al Mahalah', 'Al Khamis', 'Bihan', 'Soudah', 'Dhurah', 'Wasat al-Madinah'],
    'Taif': ['Al Hawiyah', 'Al Shafa', 'Al Hada', 'Al Rudaf', 'Al Khalidiyah', 'Al Sadad', 'Al Qumariyah', 'Al Masarah', 'Al Naseem', 'Al Wahat', 'Al Washah', 'Al Jawhara', 'Al Sharafiyah', 'Al Faisaliyah', 'Al Rawdah', 'Al Aziziyah', 'Al Rayyan', 'Al Jawabra', 'Al Mathnah', 'Al Salamah'],
    'Tabuk': ['Al Rawdah', 'Al Muruj', 'Al Wurud', 'Al Faisaliyah', 'Al Khalidiyah', 'Al Aziziyah', 'Al Rayyan', 'Al Qadisiyah', 'Al Nahda', 'Al Safa', 'Al Nakheel', 'Al Yarmouk', 'Al Rabwah', 'Al Salam', 'Al Manar', 'Al Wadi', 'Al Shifa', 'Al Arjan', 'Al Masif', 'Al Tawfiq'],
    'Buraidah': ['Al Iskan', 'Al Fayziyah', 'Al Rayyan', 'Al Nahda', 'Al Rawdah', 'Al Muntazah', 'Al Khalidiyah', 'Al Shimal', 'Al Janub', 'Al Sharq', 'Al Gharb', 'Al Salam', 'Al Basatin', 'Al Muruj', 'Al Khaleej', 'Al Nakheel', 'Al Wahda', 'Al Zahrah', 'Al Yarmouk', 'Al Quds'],
    'Khamis Mushait': ['Al Khalidiyah', 'Al Aziziyah', 'Al Faisaliyah', 'Al Nahda', 'Al Rawdah', 'Al Muntazah', 'Al Iskan', 'Al Safa', 'Al Manar', 'Al Wadi', 'Al Shifa', 'Al Arjan', 'Al Masif', 'Al Tawfiq', 'Al Rayyan', 'Al Qadisiyah', 'Al Nakheel', 'Al Yarmouk', 'Al Rabwah', 'Al Salam'],
    'Al-Hofuf': ['Al Mazrouiyah', 'Al Salmaniyah', 'Al Andalus', 'Al Khalidiyah', 'Al Rawdah', 'Al Faisaliyah', 'Al Naifa', 'Al Ruqayqah', 'Al Mutairy', 'Al Khadoud', 'Al Jamiyeen', 'Al Mahasin', 'Al Qadisiyah', 'Al Jawhara', 'Al Basatin', 'Al Nakheel', 'Al Wahda', 'Al Zahrah', 'Al Yarmouk', 'Al Quds'],
    'Al-Mubarraz': ['Al Hazm', 'Al Busayra', 'Al Rashidiya', 'Al Yahya', 'Al Qadisiyah', 'Al Mahasin', 'Al Jamiyeen', 'Al Ruqayqah', 'Al Mutairy', 'Al Khadoud', 'Al Rawdah', 'Al Faisaliyah', 'Al Naifa', 'Al Mazrouiyah', 'Al Salmaniyah', 'Al Andalus', 'Al Khalidiyah', 'Al Nakheel', 'Al Wahda', 'Al Zahrah'],
    'Hail': ['Al Montazah', 'Al Matar', 'Al Jamiah', 'Al Naqra', 'Al Shifa', 'Al Arjan', 'Al Masif', 'Al Tawfiq', 'Al Rayyan', 'Al Qadisiyah', 'Al Nakheel', 'Al Yarmouk', 'Al Rabwah', 'Al Salam', 'Al Iskan', 'Al Fayziyah', 'Al Nahda', 'Al Rawdah', 'Al Khalidiyah', 'Al Shimal'],
    'Najran': ['Al Fahd', 'Al Khalidiyah', 'Al Faisaliyah', 'Al Nahda', 'Al Rawdah', 'Al Muntazah', 'Al Iskan', 'Al Safa', 'Al Manar', 'Al Wadi', 'Al Shifa', 'Al Arjan', 'Al Masif', 'Al Tawfiq', 'Al Rayyan', 'Al Qadisiyah', 'Al Nakheel', 'Al Yarmouk', 'Al Rabwah', 'Al Salam'],
    'Hafar Al-Batin': ['Al Khalidiyah', 'Al Aziziyah', 'Al Faisaliyah', 'Al Nahda', 'Al Rawdah', 'Al Muntazah', 'Al Iskan', 'Al Safa', 'Al Manar', 'Al Wadi', 'Al Shifa', 'Al Arjan', 'Al Masif', 'Al Tawfiq', 'Al Rayyan', 'Al Qadisiyah', 'Al Nakheel', 'Al Yarmouk', 'Al Rabwah', 'Al Salam'],
    'Al Jubail': ['Al Deffi', 'Al Fanateer', 'Al Jalmudah', 'Al Huwaylat', 'Al Lulu', 'Al Mardumah', 'Al Mutrafiah', 'Industrial City', 'Port Area', 'City Center', 'Al Khalidiyah', 'Al Faisaliyah', 'Al Nahda', 'Al Rawdah', 'Al Muntazah', 'Al Iskan', 'Al Safa', 'Al Manar', 'Al Wadi', 'Al Shifa'],
    'Al Kharj': ['Al Khalidiyah', 'Al Aziziyah', 'Al Faisaliyah', 'Al Nahda', 'Al Rawdah', 'Al Muntazah', 'Al Iskan', 'Al Safa', 'Al Manar', 'Al Wadi', 'Al Shifa', 'Al Arjan', 'Al Masif', 'Al Tawfiq', 'Al Rayyan', 'Al Qadisiyah', 'Al Nakheel', 'Al Yarmouk', 'Al Rabwah', 'Al Salam'],
    'Qatif': ['Al Nasiriyah', 'Al Shuwaiakah', 'Al Majidiya', 'Al Awamiyah', 'Al Qudaih', 'Al Jish', 'Al Mallaha', 'Al Jaroudiya', 'Al Khuwailidiya', 'Al Toobi', 'Al Bahari', 'Al Qala', 'Al Khasarah', 'Al Rawdah', 'Al Faisaliyah', 'Al Naifa', 'Al Mazrouiyah', 'Al Salmaniyah', 'Al Andalus', 'Al Khalidiyah'],
    'Yanbu': ['Yanbu Al-Bahr', 'Yanbu Al-Sinaiyah', 'Yanbu Al-Nakhal', 'Al Khalidiyah', 'Al Faisaliyah', 'Al Nahda', 'Al Rawdah', 'Al Muntazah', 'Al Iskan', 'Al Safa', 'Al Manar', 'Al Wadi', 'Al Shifa', 'Al Arjan', 'Al Masif', 'Al Tawfiq', 'Al Rayyan', 'Al Qadisiyah', 'Al Nakheel', 'Al Yarmouk']
  },
  'United Arab Emirates': {
    'Dubai': ['Business Bay', 'Dubai Marina', 'Downtown Dubai', 'DIFC', 'JLT', 'Palm Jumeirah', 'Al Quoz', 'Jebel Ali', 'Deira', 'Bur Dubai', 'Al Barsha', 'Dubai Design District', 'Mirdif', 'Silicon Oasis', 'Dubai South', 'IMPZ', 'Media City', 'Internet City', 'Knowledge Park', 'Sports City'],
    'Abu Dhabi': ['Al Maryah Island', 'Al Reem Island', 'Khalifa City', 'Yas Island', 'Saadiyat Island', 'Corniche', 'Al Khalidiyah', 'Al Muroor', 'Musaffah', 'Al Bateen', 'Al Danah', 'Al Markaziyah', 'Al Zahiyah', 'Al Wahda', 'Madinat Zayed', 'Al Nahyan', 'Al Mushrif', 'Hadbat Al Zaafran', 'Masdar City', 'Bani Yas'],
    'Sharjah': ['Al Majaz', 'Al Nahda', 'Al Khan', 'Muwaileh', 'Al Qasimia', 'Al Taawun', 'Al Ramaqiā', 'Al Juraina', 'Sharjah Industrial', 'Al Mirgab', 'Al Fayha', 'Al Khezamia', 'Al Goaz', 'Al Jazzat', 'Al Falaj', 'Al Azra', 'Al Yarmook', 'Abu Shagara', 'Al Manakh', 'Al Rolla'],
    'Al Ain': ['Al Jimi', 'Al Khabisi', 'Al Muwaiji', 'Al Maqam', 'Zakher', 'Al Yahar', 'Al Ain Industrial City', 'Al Foah', 'Al Masoudi', 'Al Nyadat', 'Al Jahili', 'Al Mutaredh', 'Al Markaziya', 'Al Qattara', 'Al Hili', 'Al Ain Mall Area', 'Town Centre', 'Green Mubazzarah', 'Mezyad', 'Jebel Hafeet Area'],
    'Ajman': ['Al Nuaimia', 'Al Rawda', 'Ajman Free Zone', 'Al Jurf', 'Ajman Industrial', 'Al Rashidiya', 'Al Mowaihat', 'Al Yasmeen', 'Al Heliopholis', 'Al Bustan', 'Al Nakheel', 'Al Owan', 'Al Rumailah', 'Al Zahra', 'Al Sawan', 'Ajman Uptown', 'Emirates City', 'Al Helio', 'Al Amerah', 'Al Hamidiyah'],
    'Ras Al Khaimah': ['Al Hamra Village', 'Al Marjan Island', 'Mina Al Arab', 'RAK City', 'Al Nakheel', 'Al Dhait', 'Al Rams', 'Digdaga', 'Khat', 'Al Jazirah Al Hamra', 'RAK Industrial', 'Al Uribi', 'Al Mamourah', 'Al Maerid', 'Al Seer', 'Al Sidroh', 'Al Juwais', 'Al Qusaidat', 'Al Burairat', 'Al Hudaibah'],
    'Fujairah': ['Fujairah City', 'Al Faseel', 'Al Hayl', 'Sakakam', 'Dibba', 'Al Aqah', 'Khor Fakkan Road Area', 'Port Area', 'Industrial Area', 'Corniche', 'Al Bidya', 'Masafi', 'Mirbah', 'Qidfa', 'Kalba Road Area', 'Fujairah Free Zone', 'Al Sharyah', 'Al Gurfah', 'Merashid', 'Onhit'],
    'Umm Al Quwain': ['Al Salamah', 'Al Raudah', 'Al Ramlah', 'Al Khor', 'Al Maidan', 'Old Town', 'Industrial Area', 'Falaj Al Mualla', 'Al Haditha', 'Al Hawiyah', 'Al Abraq', 'Al Rashid', 'Al Dar Al Baida', 'Al Mualla', 'Seneyah Island Area', 'UAQ Free Zone', 'Al Humrah', 'Al Mugta', 'Al Rashidiya', 'Al Riqqah'],
    'Khor Fakkan': ['Corniche', 'Port Area', 'City Center', 'Al Yarmouk', 'Al Qadisiyah', 'Al Haray', 'Al Mudifi', 'Al Lulayyah', 'Al Zubarah', 'Al Hayawah', 'Al Rafisah', 'Al Shis', 'Nahwa', 'Al Nahda', 'Al Mansur', 'Al Faisaliyah', 'Al Rawdah', 'Al Aziziyah', 'Al Rayyan', 'Al Qir'],
    'Kalba': ['Corniche', 'City Center', 'Al Safaf', 'Al Ghail', 'Al Musalla', 'Al Mahtah', 'Al Sour', 'Al Wahda', 'Al Bardi', 'Al Qasimia', 'Al Sidra', 'Al Khatam', 'Al Mafraq', 'Al Rumitha', 'Al Tarif', 'Al Hayl', 'Al Qurm', 'Industrial Area', 'Port Area', 'Al Mudam'],
    'Jebel Ali': ['Port Area', 'Free Zone North', 'Free Zone South', 'Village', 'Industrial 1', 'Industrial 2', 'Industrial 3', 'Freezone Extension', 'DIP 1', 'DIP 2', 'TechnoPark', 'Palm Jebel Ali', 'Venice', 'Downtown Jebel Ali', 'Lahar', 'Marina Jebel Ali', 'Logistic City', 'Aviation City', 'South Park', 'Gate Area'],
    'Dibba Al-Fujairah': ['City Center', 'Al Akamiya', 'Al Muhallab', 'Al Ras', 'Al Ghurfah', 'Al Rashid', 'Al Wahda', 'Al Faisaliyah', 'Al Rawdah', 'Al Aziziyah', 'Al Rayyan', 'Al Qadisiyah', 'Al Nakheel', 'Al Yarmouk', 'Al Rabwah', 'Al Salam', 'Al Manar', 'Al Wadi', 'Al Shifa', 'Al Arjan'],
    'Madinat Zayed': ['City Center', 'Old Town', 'Industrial Area', 'Al Dhafra', 'Liwa', 'Gayathi', 'Ruwais', 'Mirfa', 'Sila', 'Delma', 'Al Marfa', 'Habshan', 'Asab', 'Shah', 'Sahil', 'Bu Hasa', 'Beda Zayed', 'Qareen Al Aish', 'Um Al Ishtan', 'Madinat Zayed 2'],
    'Ruwais': ['City Center', 'Housing Complex', 'Industrial Area', 'Port Area', 'Refinery Area', 'Fertil Area', 'Borouge Area', 'Gasco Area', 'Takreer Area', 'Gayathi Road', 'Airport Area', 'Beach Area', 'Central Park', 'South Sector', 'North Sector', 'West Sector', 'East Sector', 'Business District', 'Education Zone', 'Healthcare Zone'],
    'Liwa Oasis': ['Mezaira\'a', 'Kayyam', 'Maria Al Gharbiya', 'Humar', 'Dhafir', 'Arada', 'Muwaiqih', 'Qutuf', 'Tharwaniyah', 'Sabkah', 'Shah', 'Haleeba', 'Buhasa', 'Asab', 'Sahil', 'Beda Zayed', 'Madinat Zayed', 'Ruwais', 'Mirfa', 'Gayathi'],
    'Dhaid': ['City Center', 'Al Madam', 'Al Batayeh', 'Al Zubair', 'Al Sajaa', 'Al Rahmaniya', 'Al Suyoh', 'Al Khawaneej', 'Al Aweer', 'Al Lisaili', 'Al Marmoom', 'Al Qudra', 'Al Faqa', 'Al Yahar', 'Al Ain Road', 'Industrial Area', 'Agriculture Area', 'Central Park', 'University Area', 'Military Area'],
    'Hatta': ['City Center', 'Heritage Village', 'Hatta Dam Area', 'Al Dhahra', 'Al Jeeza', 'Al Sayegh', 'Al Rawdah', 'Al Faisaliyah', 'Al Nahda', 'Al Muntazah', 'Al Iskan', 'Al Safa', 'Al Manar', 'Al Wadi', 'Al Shifa', 'Al Arjan', 'Al Masif', 'Al Tawfiq', 'Al Rayyan', 'Al Qadisiyah'],
    'Ar-Rams': ['City Center', 'Beach Area', 'Industrial Area', 'Port Area', 'Al Rams North', 'Al Rams South', 'Al Rams East', 'Al Rams West', 'Al Rams Central', 'Market Area', 'Residential 1', 'Residential 2', 'Residential 3', 'Old Rams', 'New Rams', 'Mountain Area', 'Harbor Area', 'School Zone', 'Clinic Area', 'Park Zone'],
    'Dibba Al-Hisn': ['City Center', 'Al Hisn', 'Al Corniche', 'Al Marsa', 'Al Khair', 'Al Salam', 'Al Noor', 'Al Iman', 'Al Huda', 'Al Taqwa', 'Al Bir', 'Al Ihsan', 'Al Ikhlas', 'Al Wafa', 'Al Amal', 'Al Saada', 'Al Farah', 'Al Sorour', 'Al Bahja', 'Al Hana'],
    'Al Jazirah Al Hamra': ['Old Town', 'New Town', 'Industrial Zone', 'Port Area', 'Beach Resort Area', 'Al Hamra Mall Area', 'Village North', 'Village South', 'Marina Area', 'Golf Course Area', 'Cottage Area', 'Apartment Zone', 'Townhouse Zone', 'Commercial Strip', 'Utility Zone', 'Green Belt', 'Heritage Site', 'Fisherman Wharf', 'Yacht Club', 'Community Center']
  },
  'India': {
    'Mumbai': ['BKC', 'Nariman Point', 'Powai', 'Worli', 'Andheri East', 'Andheri West', 'Lower Parel', 'Colaba', 'Bandra West', 'Bandra East', 'Juhu', 'Malad West', 'Borivali West', 'Goregaon East', 'Vile Parle', 'Santacruz West', 'Khar West', 'Prabhadevi', 'Dadkar West', 'Chembur'],
    'Delhi': ['Connaught Place', 'Gurgaon Sector 29', 'Noida Sector 62', 'Okhla Industrial', 'Saket', 'Vasant Kunj', 'Hauz Khas', 'Greater Kailash', 'Lajpat Nagar', 'Dwarka', 'Rohini', 'Pitampura', 'Janakpuri', 'Karol Bagh', 'Paharganj', 'Chandni Chowk', 'Civil Lines', 'Model Town', 'Punjabi Bagh', 'Rajouri Garden'],
    'Bangalore': ['Whitefield', 'Electronic City', 'Koramangala', 'Indiranagar', 'HSR Layout', 'JP Nagar', 'Jayanagar', 'MG Road', 'Lavelle Road', 'Richmond Town', 'Malleshwaram', 'Rajajinagar', 'Hebbal', 'Yelahanka', 'Bannerghatta Road', 'Sarjapur Road', 'Bellandur', 'Marathahalli', 'BTM Layout', 'Banashankari'],
    'Hyderabad': ['Hitech City', 'Gachibowli', 'Madhapur', 'Banjara Hills', 'Jubilee Hills', 'Kondapur', 'Manikonda', 'Kukatpally', 'Ameerpet', 'Begumpet', 'Somajiguda', 'Secunderabad', 'Uppal', 'LB Nagar', 'Abids', 'Koti', 'Himayatnagar', 'Dilsukhnagar', 'Miyapur', 'Chandanagar'],
    'Ahmedabad': ['C G Road', 'Ashram Road', 'S G Highway', 'Satellite', 'Prahlad Nagar', 'Bodakdev', 'Thaltej', 'Vastrapur', 'Navrangpura', 'Ellis Bridge', 'Ambawadi', 'Maninagar', 'Bopal', 'Gota', 'Naranpura', 'Paldi', 'Sabarmati', 'Chandkheda', 'Shahibaug', 'Naroda'],
    'Chennai': ['T Nagar', 'Adyar', 'Mylapore', 'Alwarpet', 'Anna Nagar', 'Velachery', 'OMR', 'ECR', 'Guindy', 'Nungambakkam', 'Egmore', 'Kilpauk', 'Royapettah', 'Besant Nagar', 'Thiruvanmiyur', 'Pallikaranai', 'Medavakkam', 'Tambaram', 'Chromepet', 'Porur'],
    'Kolkata': ['Park Street', 'Salt Lake Sector V', 'New Town', 'Ballygunge', 'Alipore', 'Tollygunge', 'Behala', 'Garia', 'Dum Dum', 'Barasat', 'Howrah', 'Lake Town', 'Kankurgachi', 'Bowbazar', 'Burrabazar', 'Chowringhee', 'Dalhousie', 'Kasba', 'Jadavpur', 'South City'],
    'Surat': ['Adajan', 'Varachha', 'Katargam', 'Puna', 'Vesu', 'Piplod', 'Dumas', 'Althan', 'Bhatar', 'Majura Gate', 'Ring Road', 'Nanpura', 'Salabatpura', 'Mahidharpura', 'Athwa Lines', 'Sarthana', 'Kamrej', 'Olpad', 'Chaurasi', 'Sachin'],
    'Pune': ['Koregaon Park', 'Kalyani Nagar', 'Viman Nagar', 'Hinjewadi', 'Magarpatta', 'Baner', 'Aundh', 'Shivajinagar', 'Kothrud', 'Camp', 'Hadapsar', 'Wagholi', 'Pimple Saudagar', 'Wakad', 'Chinchwad', 'Bhosari', 'Nigdi', 'Katraj', 'Bibwewadi', 'Kondhwa'],
    'Jaipur': ['C-Scheme', 'Malviya Nagar', 'Vaishali Nagar', 'Mansarovar', 'Raja Park', 'Adarsh Nagar', 'Bani Park', 'Jawahar Nagar', 'Civil Lines', 'Tonk Road', 'Sanganer', 'Sitapura', 'Vidhyadhar Nagar', 'Shastri Nagar', 'Muralipura', 'Jhotwara', 'Amer Road', 'Johari Bazar', 'Bapu Bazar', 'Pink City'],
    'Lucknow': ['Hazratganj', 'Gomti Nagar', 'Aliganj', 'Indira Nagar', 'Jankipuram', 'Ashiyana', 'Rajajipuram', 'Chowk', 'Aminabad', 'Charbagh', 'Vikash Nagar', 'Mahanagar', 'Butler Colony', 'Sushant Golf City', 'LDA Colony', 'Vrindavan Yojna', 'Telibagh', 'Alambagh', 'Sarojini Nagar', 'Bakshi Ka Talab'],
    'Kanpur': ['Civil Lines', 'Swaroop Nagar', 'Arya Nagar', 'Tilak Nagar', 'Azad Nagar', 'Vishnupuri', 'Kidwai Nagar', 'Govind Nagar', 'Sharda Nagar', 'Kalyanpur', 'Panki', 'Jajmau', 'Chakeri', 'Shyam Nagar', 'Barra', 'Naubasta', 'Lajpat Nagar', 'Rawatpur', 'Kakadeo', 'Mall Road'],
    'Nagpur': ['Civil Lines', 'Ramdaspeth', 'Dharampeth', 'Lakadganj', 'Sadar', 'Sitabuldi', 'Manish Nagar', 'Wardha Road', 'Amravati Road', 'Katol Road', 'Kamptee Road', 'Bhandara Road', 'Wathoda', 'Mihan', 'Butibori', 'Trimurti Nagar', 'Pratap Nagar', 'Narendra Nagar', 'Bajaj Nagar', 'Congress Nagar'],
    'Indore': ['Vijay Nagar', 'Saket', 'Old Palasia', 'New Palasia', 'Bhawarkua', 'Rajwada', 'Sarafa', 'Annpurna', 'Sudama Nagar', 'Rau', 'Pithampur', 'Dewas Naka', 'LIG Colony', 'MIG Colony', 'Sch No 54', 'Sch No 74', 'Sch No 78', 'Kanadia Road', 'Bengali Square', 'Khajrana'],
    'Thane': ['Ghodbunder Road', 'Wagle Estate', 'Naupada', 'Kopri', 'Vartak Nagar', 'Panchpakhadi', 'Hiranandani Estate', 'Vasant Vihar', 'Majiwada', 'Kapurbawdi', 'Kalwa', 'Mumbra', 'Diva', 'Bhiwandi', 'Kalyan', 'Dombivli', 'Ulhasnagar', 'Ambernath', 'Badlapur', 'Bhayandar'],
    'Bhopal': ['Arera Colony', 'MP Nagar', 'TT Nagar', 'Habibganj', 'Gulmohar', 'Kolar Road', 'Bairagarh', 'Misrod', 'Mandideep', 'Govindpura', 'BHEL Area', 'Ashoka Garden', 'Ayodhya Bypass', 'Jahangirabad', 'Old City', 'Koh-e-Fiza', 'Lalghati', 'Shajahanabad', 'Nishatpura', 'Karond'],
    'Visakhapatnam': ['MVP Colony', 'Seethammadhara', 'Dwaraka Nagar', 'Siripuram', 'Beach Road', 'Rushikonda', 'Gajuwaka', 'Steel Plant Area', 'Kurmannapalem', 'Duvvada', 'Anakapalle', 'Bheemili', 'Madhurawada', 'Pendurthi', 'Simhachalam', 'Murali Nagar', 'Kancharapalem', 'Allipuram', 'Jagadamba Junction', 'Waltair Uplands'],
    'Pimpri-Chinchwad': ['Pimpri', 'Chinchwad', 'Akurdi', 'Nigdi', 'Bhosari', 'Sangvi', 'Wakad', 'Tathawade', 'Punawale', 'Ravet', 'Moshi', 'Chikhali', 'Dighi', 'Charholi', 'Kalewadi', 'Rahatani', 'Thergaon', 'Kiwale', 'Mamurdi', 'Talwade'],
    'Patna': ['Boring Road', 'Patliputra Colony', 'Rajendra Nagar', 'Kankarbagh', 'Anisabad', 'Gardanibagh', 'Danapur', 'Khagaul', 'Phulwari Sharif', 'Digha', 'Kurji', 'Ashiana Nagar', 'Raja Bazar', 'Bailey Road', 'Fraser Road', 'Gandhi Maidan', 'Exhibition Road', 'Dak Bungalow Road', 'Kadamkuan', 'Mahendru'],
    'Vadodara': ['Alkapuri', 'Race Course', 'Old Padra Road', 'Akota', 'Gotri', 'Vasna', 'Bhayli', 'Waghodia Road', 'Ajwa Road', 'Fatehgunj', 'Sayajigunj', 'Karelibaug', 'Sama', 'Harni', 'Manjalpur', 'Makarpura', 'Tarsali', 'Subhanpura', 'Ellora Park', 'Gorwa']
  },
  'Canada': {
    'Toronto': ['Financial District', 'Liberty Village', 'Yorkville', 'Entertainment District', 'King West', 'Queen West', 'Distillery District', 'The Beaches', 'Leslieville', 'Roncesvalles', 'High Park', 'Annex', 'Cabbagetown', 'St. Lawrence', 'North York', 'Scarborough', 'Etobicoke', 'York', 'East York', 'Leaside'],
    'Vancouver': ['Downtown', 'Gastown', 'Yaletown', 'Coal Harbour', 'West End', 'Kitsilano', 'Mount Pleasant', 'Fairview', 'Main Street', 'Commercial Drive', 'Grandview-Woodland', 'South Granville', 'Arbutus Ridge', 'Point Grey', 'Oakridge', 'Marpole', 'Kerrisdale', 'Hastings-Sunrise', 'Strathcona', 'Shaughnessy'],
    'Montreal': ['Downtown', 'Old Montreal', 'Plateau', 'Mile End', 'Griffintown', 'Saint-Henri', 'Little Italy', 'Verdun', 'Outremont', 'Westmount', 'Ahuntsic', 'Rosemont', 'Villeray', 'Hochelaga', 'Anjou', 'Saint-Leonard', 'Lachine', 'Dorval', 'Pointe-Claire', 'Kirkland'],
    'Calgary': ['Downtown', 'Beltline', 'Inglewood', 'Kensington', 'Bridgeland', 'Mission', 'Marda Loop', 'Sunnyside', 'Eau Claire', 'East Village', 'Mount Royal', 'Aspen Woods', 'Signal Hill', 'Saddle Ridge', 'Martindale', 'Auburn Bay', 'Mahogany', 'Seton', 'Heritage', 'Chinook'],
    'Ottawa': ['Centretown', 'ByWard Market', 'The Glebe', 'Westboro', 'Hintonburg', 'Orleans', 'Kanata', 'Barrhaven', 'Riverside South', 'Old Ottawa South', 'Old Ottawa East', 'Rockcliffe Park', 'New Edinburgh', 'Vanier', 'Sandy Hill', 'Alta Vista', 'Hunt Club', 'Stittsville', 'Findlay Creek', 'Manotick'],
    'Edmonton': ['Downtown', 'Oliver', 'Old Strathcona', 'Garneau', 'Glenora', 'Bonnie Doon', 'Windermere', 'Summerside', 'Terwillegar', 'Mill Woods', 'Castle Downs', 'Claireview', 'Ellerslie', 'Heritage Valley', 'Keswick', 'Rutherford', 'McKernan', 'Belgravia', 'Riverdale', 'Rossdale'],
    'Winnipeg': ['Exchange District', 'The Forks', 'Osborne Village', 'Corydon', 'Wolseley', 'St. Boniface', 'St. Vital', 'St. James', 'Transcona', 'Tuxedo', 'River Heights', 'Linden Woods', 'Island Lakes', 'Bridgwater', 'Sage Creek', 'Fort Garry', 'Charleswood', 'North End', 'Garden City', 'West Kildonan'],
    'Quebec City': ['Old Quebec', 'Saint-Roch', 'Saint-Jean-Baptiste', 'Montcalm', 'Limoilou', 'Sainte-Foy', 'Sillery', 'Cap-Rouge', 'Beauport', 'Charlesbourg', 'Vanier', 'Duburger', 'Neufchatel', 'Lebourgneuf', 'Val-Belair', 'Loretteville', 'Lac-Saint-Charles', 'Saint-Emile', 'Cap-Diamant', 'Saint-Sauveur'],
    'Hamilton': ['Downtown', 'Westdale', 'Ancaster', 'Dundas', 'Stoney Creek', 'Glanbrook', 'Waterdown', 'Mount Hope', 'Corktown', 'Durand', 'Kirkendall', 'Locke Street', 'James Street North', 'Ottawa Street', 'Concession Street', 'King Street West', 'Bayfront', 'North End', 'South Mountain', 'East Mountain'],
    'London ON': ['Downtown', 'Old East Village', 'Wortley Village', 'Byron', 'Oakridge', 'Westmount', 'White Oaks', 'Argyle', 'Fan-shawe', 'Masonville', 'University Heights', 'Woodhull', 'Lambeth', 'Southcrest', 'Glen Cairn', 'Pond Mills', 'Stoney Creek', 'Cedar Hollow', 'River Bend', 'Talbot Village'],
    'Kitchener': ['Downtown', 'Belmont Village', 'Victoria Park Area', 'Doone Heritage', 'Grand River', 'Freeport', 'Stanley Park', 'Breslau', 'Hidden Valley', 'Pioneer Tower', 'Deer Ridge', 'Chicopee', 'Hidden Valley', 'Centennial', 'Forest Heights', 'Idlewood', 'Lackner Woods', 'Wildwood', 'Hidden Valley', 'Pioneer Park'],
    'Victoria': ['Inner Harbour', 'James Bay', 'Fairfield', 'Cook Street Village', 'Oak Bay', 'Fernwood', 'Rockland', 'Gonzales', 'Vic West', 'Burnside', 'Hillside', 'Quadra', 'Jubilee', 'Gordon Head', 'Cadboro Bay', 'Uplands', 'Esquimalt', 'View Royal', 'Colwood', 'Langford'],
    'Halifax': ['Downtown', 'North End', 'South End', 'West End', 'Quinpool Road', 'Spring Garden Road', 'Dartmouth', 'Bedford', 'Sackville', 'Clayton Park', 'Fairview', 'Spryfield', 'Timberlea', 'Hammonds Plains', 'Tantallon', 'Waverley', 'Fall River', 'Eastern Passage', 'Cole Harbour', 'Grand Desert'],
    'Oshawa': ['Downtown', 'North Oshawa', 'South Oshawa', 'Kedron', 'Columbus', 'Raglan', 'Windfields', 'Samac', 'Pinecrest', 'Donevan', 'Lakeview', 'Farewell', 'Beatrice', 'Rossland', 'Adelaide', 'Gibbons', 'Northglen', 'Vanier', 'Central', 'McLaughlin'],
    'Windsor': ['Downtown', 'Walkerville', 'Olde Sandwich', 'Riverside', 'East Windsor', 'West Windsor', 'South Windsor', 'Roseland', 'Southwood Lakes', 'Forest Glade', 'Fontainebleau', 'Walker Road', 'Howard Avenue', 'Tecumseh', 'Lakeshore', 'Lasalle', 'Amherstburg', 'Kingsville', 'Leamington', 'Harrow'],
    'Saskatoon': ['Downtown', 'Broadway', 'Riversdale', 'Nutana', 'City Park', 'Evergreen', 'Rosewood', 'Willowgrove', 'Brighton', 'Aspen Ridge', 'Stonebridge', 'Hampton Village', 'Kensington', 'Blairmore', 'Confederation Park', 'Fairhaven', 'Meadowgreen', 'Mount Royal', 'Pleasant Hill', 'Westmount'],
    'Regina': ['Downtown', 'Cathedral', 'Whitmore Park', 'Harbour Landing', 'Westerra', 'The Creeks', 'Greens on Gardiner', 'Wascana View', 'University Park', 'Douglas Park', 'Arnhem Place', 'Gladmer Park', 'Boothill', 'Lakeview', 'Albert Park', 'Hillsdale', 'Normandy Heights', 'Uplands', 'Argyle Park', 'Walsh Acres'],
    'Sherbrooke': ['Centro', 'Mont-Bellevue', 'Fleurimont', 'Jacques-Cartier', 'Lennoxville', 'Rock Forest', 'Saint-Elie', 'Deauville', 'Brompton', 'Ascot', 'Beauvoir', 'Huntingville', 'Milby', 'Capelton', 'Eustis', 'Albert-Mines', 'Belvedere', 'King Ouest', 'Galt Ouest', 'Portland'],
    'St. Johns': ['Downtown', 'Quidi Vidi', 'Churchill Park', 'Georgestown', 'Rabbittown', 'Southlands', 'Galway', 'Airport Heights', 'Clovelly', 'Virgin Arm', 'Logy Bay', 'Middle Cove', 'Outer Cove', 'Torbay', 'Portugal Cove', 'St. Philips', 'Paradise', 'Mount Pearl', 'Conception Bay South', 'Goulds'],
    'Kelowna': ['Downtown', 'Pandosy Village', 'Mission', 'Upper Mission', 'Lower Mission', 'Rutland', 'Black Mountain', 'Wilden', 'Kettle Valley', 'Glenmore', 'Dilworth Mountain', 'Highlands', 'Ellison', 'Joe Rich', 'Southeast Kelowna', 'North Glenmore', 'Magic Estates', 'Crawford', 'Hall Road', 'McCulloch']
  },
  'Australia': {
    'Sydney': ['CBD', 'Surry Hills', 'North Sydney', 'Parramatta', 'Darlinghurst', 'Paddington', 'Pyrmont', 'Ultimo', 'The Rocks', 'Haymarket', 'Chippendale', 'Redfern', 'Alexandria', 'Waterloo', 'Zetland', 'Rosebery', 'Mascot', 'Bondi Junction', 'Chatswood', 'Macquarie Park'],
    'Melbourne': ['CBD', 'Southbank', 'Docklands', 'Richmond', 'Fitzroy', 'Collingwood', 'South Melbourne', 'St Kilda', 'Carlton', 'Brunswick', 'South Yarra', 'Prahran', 'Windsor', 'Toorak', 'Hawthorn', 'Camberwell', 'Box Hill', 'Glen Waverley', 'Footscray', 'Williamstown'],
    'Brisbane': ['CBD', 'Fortitude Valley', 'South Brisbane', 'West End', 'New Farm', 'Teneriffe', 'Bowen Hills', 'Spring Hill', 'Kangaroo Point', 'Milton', 'Paddington', 'Kelvin Grove', 'Ascot', 'Hamilton', 'Bulimba', 'Hawthorne', 'Toowong', 'Indooroopilly', 'St Lucia', 'Chermside'],
    'Perth': ['CBD', 'Northbridge', 'West Perth', 'East Perth', 'Subiaco', 'Leederville', 'Mount Lawley', 'Highgate', 'South Perth', 'Victoria Park', 'Burswood', 'Maylands', 'Claremont', 'Cottesloe', 'Fremantle', 'Applecross', 'Joondalup', 'Midland', 'Armadale', 'Rockingham'],
    'Adelaide': ['CBD', 'North Adelaide', 'Norwood', 'Unley', 'Burnside', 'Fullarton', 'Parkside', 'Goodwood', 'Mile End', 'Thebarton', 'Prospect', 'Brompton', 'Glenelg', 'Brighton', 'Henley Beach', 'Port Adelaide', 'Semaphore', 'Mawson Lakes', 'Golden Grove', 'Tea Tree Gully'],
    'Gold Coast': ['Surfers Paradise', 'Broadbeach', 'Main Beach', 'Southport', 'Burleigh Heads', 'Coolangatta', 'Robina', 'Varsity Lakes', 'Mermaid Beach', 'Nobby Beach', 'Miami', 'Palm Beach', 'Currumbin', 'Tugun', 'Bilinga', 'Helensvale', 'Coomera', 'Hope Island', 'Sanctuary Cove', 'Arundel'],
    'Canberra': ['Civic', 'Acton', 'Braddon', 'Kingston', 'Manuka', 'Barton', 'Yarralumla', 'Deakin', 'Griffith', 'Narrabundah', 'Red Hill', 'Forrest', 'Woden', 'Phillip', 'Belconnen', 'Gungahlin', 'Tuggeranong', 'Dickson', 'Ainslie', 'O\'Connor'],
    'Newcastle AU': ['CBD', 'Honeysuckle', 'The Hill', 'Cooks Hill', 'Bar Beach', 'The Junction', 'Merewether', 'Hamilton', 'Islington', 'Tigheshill', 'Mayfield', 'Broadmeadow', 'Kotara', 'Charlestown', 'Warners Bay', 'Toronto', 'Maitland', 'Cessnock', 'Kurri Kurri', 'Raymond Terrace'],
    'Wollongong': ['CBD', 'North Wollongong', 'South Wollongong', 'West Wollongong', 'Mount Keira', 'Mount Pleasant', 'Gwynneville', 'Keiraville', 'Fairy Meadow', 'Balgownie', 'Corrimal', 'Woonona', 'Bulli', 'Thirroul', 'Figtree', 'Unanderra', 'Berkeley', 'Warrawong', 'Port Kembla', 'Shellharbour'],
    'Geelong': ['CBD', 'Drumcondra', 'Rippleside', 'Hamlyn Heights', 'Herne Hill', 'Newtown', 'Geelong West', 'South Geelong', 'Belmont', 'Highton', 'Grovedale', 'Waurn Ponds', 'Marshall', 'Armstrong Creek', 'Charlemont', 'St Albans Park', 'Whittington', 'Newcomb', 'East Geelong', 'Lara'],
    'Hobart': ['CBD', 'Battery Point', 'Sandy Bay', 'North Hobart', 'West Hobart', 'South Hobart', 'Mount Stuart', 'Lenah Valley', 'New Town', 'Moonah', 'Glenorchy', 'Bellerive', 'Rosny Park', 'Lindisfarne', 'Howrah', 'Kingston', 'Blackmans Bay', 'Taroona', 'Richmond', 'Sorell'],
    'Townsville': ['CBD', 'North Ward', 'South Townsville', 'Railway Estate', 'Hermit Park', 'Mundingburra', 'Pimlico', 'Hyde Park', 'Aitkenvale', 'Annandale', 'Douglas', 'Kirwan', 'Thuringowa Central', 'Condon', 'Rasmussen', 'Kelso', 'Bohle Plains', 'Bushland Beach', 'Deeragun', 'Oonoonba'],
    'Cairns': ['CBD', 'North Cairns', 'Edge Hill', 'Whitfield', 'Stratford', 'Freshwater', 'Redlynch', 'Brinsmead', 'Kamonga', 'Earlville', 'Woree', 'Bayview Heights', 'Mount Sheridan', 'White Rock', 'Edmonton', 'Gordonvale', 'Palm Cove', 'Clifton Beach', 'Kewarra Beach', 'Trinity Beach'],
    'Toowoomba': ['CBD', 'East Toowoomba', 'South Toowoomba', 'North Toowoomba', 'Rangeville', 'Mount Lofty', 'Middle Ridge', 'Kearney Springs', 'Darling Heights', 'Wilsonton', 'Newtown', 'Glenvale', 'Highfields', 'Meringandan', 'Kingsthorpe', 'Oakey', 'Pittsworth', 'Millmerran', 'Crows Nest', 'Gatton'],
    'Darwin': ['CBD', 'Waterfront', 'Larrakeyah', 'Stuart Park', 'Fannie Bay', 'Parap', 'Ludmilla', 'Nightcliff', 'Rapid Creek', 'Casuarina', 'Tiwi', 'Wanguri', 'Leanyer', 'Muirhead', 'Lyons', 'Palmerston', 'Bakewell', 'Durack', 'Rosebery', 'Zuccoli'],
    'Ballarat': ['CBD', 'Lake Wendouree', 'Newington', 'Sturt St Area', 'Soldiers Hill', 'Black Hill', 'Mount Pleasant', 'Golden Point', 'Sovereign Hill Area', 'Lucas', 'Alfredton', 'Delacombe', 'Redan', 'Sebastopol', 'Mount Clear', 'Mount Helen', 'Buninyong', 'Brown Hill', 'Invermay', 'Nerrina'],
    'Bendigo': ['CBD', 'Quarry Hill', 'Kennington', 'Strathdale', 'Spring Gully', 'Golden Square', 'Kangaroo Flat', 'Maiden Gully', 'Marong', 'Epsom', 'Huntly', 'White Hills', 'North Bendigo', 'Ironbark', 'Long Gully', 'California Gully', 'Eaglehawk', 'Junortoun', 'Flora Hill', 'Ascot'],
    'Albury': ['CBD', 'South Albury', 'East Albury', 'West Albury', 'North Albury', 'Lavington', 'Thurgoona', 'Splitters Creek', 'Hamilton Valley', 'Glenroy', 'Springdale Heights', 'Table Top', 'Jindera', 'Wodonga CBD', 'West Wodonga', 'South Wodonga', 'Baranduda', 'Killara', 'Bandiana', 'Bonegilla'],
    'Launceston': ['CBD', 'East Launceston', 'South Launceston', 'West Launceston', 'Invermay', 'Mowbray', 'Newnham', 'Rocherlea', 'Trevallyn', 'Riverside', 'Legana', 'Kings Meadows', 'Youngtown', 'Hadspen', 'Perth TAS', 'Longford', 'Evandale', 'St Leonards', 'Waverley', 'Ravenswood'],
    'Sunshine Coast': ['Maroochydore', 'Mooloolaba', 'Alexandra Headland', 'Buderim', 'Caloundra', 'Kawana Waters', 'Coolum Beach', 'Noosa Heads', 'Noosaville', 'Sunshine Beach', 'Peregian Beach', 'Nambour', 'Maleny', 'Montville', 'Eumundi', 'Yandina', 'Palmwoods', 'Glass House Mountains', 'Beerwah', 'Landsborough']
  },
  'Singapore': {
    'Singapore Central': ['Marina Bay', 'Orchard Road', 'Raffles Place', 'Shenton Way', 'Clarke Quay', 'Boat Quay', 'City Hall', 'Bugis', 'Chinatown', 'Tanjong Pagar', 'River Valley', 'Newton', 'Novena', 'Thomson', 'Bukit Timah', 'Holland Village', 'Queenstown', 'Redhill', 'Tiong Bahru', 'Outram'],
    'Singapore East': ['Tampines', 'Pasir Ris', 'Bedok', 'Simei', 'Changi', 'Loyang', 'Kaki Bukit', 'Ubi', 'Paya Lebar', 'Marine Parade', 'Katong', 'Joo Chiat', 'Siglap', 'Mountbatten', 'Old Airport', 'Dakota', 'Geylang', 'Aljunied', 'MacPherson', 'Eunos'],
    'Singapore West': ['Jurong East', 'Jurong West', 'Boon Lay', 'Pioneer', 'Tuas', 'Clementi', 'West Coast', 'Bukit Batok', 'Bukit Panjang', 'Choa Chu Kang', 'Tengah', 'Yew Tee', 'Hillview', 'Upper Bukit Timah', 'Pandan Valley', 'Ghim Moh', 'Dover', 'Kent Ridge', 'Pasir Panjang', 'Telok Blangah'],
    'Singapore North': ['Woodlands', 'Sembawang', 'Yishun', 'Canberra', 'Admiralty', 'Marsiling', 'Kranji', 'Sungei Kadut', 'Lentor', 'Upper Thomson', 'Springleaf', 'Mandai', 'Sembawang Hills', 'Seletar Hills', 'Nim Road', 'Jalan Kayu', 'Lower Seletar', 'Orchid Country Club', 'Simpang', 'Gambas'],
    'Singapore North-East': ['Sengkang', 'Punggol', 'Hougang', 'Serangoon', 'Ang Mo Kio', 'Bishan', 'Marymount', 'Potong Pasir', 'Woodleigh', 'Tai Seng', 'Bartley', 'Lorong Chuan', 'Serangoon Gardens', 'Seletar', 'Fernvale', 'Buangkok', 'Compassvale', 'Rivervale', 'Punggol Waterway', 'Coney Island Area'],
    'Singapore Islands': ['Sentosa', 'Sentosa Cove', 'Palawan', 'Siloso', 'Tanjong Beach', 'Quayside Isle', 'Pulau Ubin', 'Pulau Tekong', 'St Johns Island', 'Lazarus Island', 'Kusu Island', 'Sisters Island', 'Seringat Island', 'Pulau Hantu', 'Pulau Bukom', 'Pulau Semakau', 'Pulau Brani', 'Pulau Sudong', 'Pulau Pawai', 'Pulau Senang'],
    'Singapore Industrial': ['Jurong Island', 'Tuas South', 'Buroh', 'Gul', 'Benoi', 'Pioneer Sector', 'Shipyard', 'International Business Park', 'Changi Business Park', 'One North', 'Science Park 1', 'Science Park 2', 'Mediapolis', 'Biopolis', 'Fusionopolis', 'Seletar Aerospace Park', 'Defu', 'Loyang Industrial', 'Tai Seng Industrial', 'Sunview'],
    'Singapore Recreation': ['Gardens by the Bay', 'Botanic Gardens', 'East Coast Park', 'West Coast Park', 'Pasir Ris Park', 'Bishan-Ang Mo Kio Park', 'Jurong Lake Gardens', 'Punggol Waterway Park', 'MacRitchie Reservoir', 'Lower Peirce Reservoir', 'Upper Peirce Reservoir', 'Upper Seletar Reservoir', 'Bedok Reservoir', 'Bukit Timah Hill', 'Southern Ridges', 'Mount Faber', 'Pulau Ubin Park', 'Sungei Buloh', 'Coney Island', 'Admiralty Park'],
    'Singapore Heritage': ['Little India', 'Kampong Glam', 'Geylang Serai', 'Balestier', 'Jalan Besar', 'Katong-Joo Chiat', 'Telok Ayer', 'Amoy Street', 'Club Street', 'Duxton Hill', 'Ann Siang Hill', 'Everton Park', 'Emerald Hill', 'Blair Plain', 'Cairnhill', 'Mount Sophia', 'Wilkie Edge', 'Bras Basah', 'Waterloo Street', 'Middle Road'],
    'Singapore Education': ['National University of Singapore', 'Nanyang Technological University', 'Singapore Management University', 'SUTD', 'SIT', 'SUSS', 'Polytechnic North', 'Polytechnic West', 'Polytechnic East', 'Polytechnic Central', 'Polytechnic South', 'ITE College Central', 'ITE College West', 'ITE College East', 'Junior College North', 'Junior College South', 'Junior College East', 'Junior College West', 'School of the Arts', 'Lasalle'],
    'Singapore Medical': ['Outram Medical Campus', 'Novena Medical Hub', 'Kent Ridge Medical Center', 'Farrer Park Medical', 'Gleneagles', 'Mount Elizabeth', 'Mount Alvernia', 'Thomson Medical', 'Raffles Medical', 'Changi General', 'Khoo Teck Puat', 'Tan Tock Seng', 'KK Women and Children', 'Alexandra Hospital', '$\text{Ng Teng Fong}$', '$\text{Sengkang General}$', '$\text{Bright Vision}$', '$\text{Ren Ci}$', '$\text{Ang Mo Kio Community}$', '$\text{St Luke\'s}$'],
    'Singapore Transit': ['Changi Airport T1', 'Changi Airport T2', 'Changi Airport T3', 'Changi Airport T4', 'Jewel Changi', 'Woodlands Checkpoint', 'Tuas Checkpoint', 'Marina South Pier', 'HarbourFront Terminal', 'Tanah Merah Ferry', 'Changi Ferry', 'Pasir Panjang Terminal', 'Brani Terminal', 'Keppel Terminal', 'Tanjong Pagar Terminal', 'Tuas Mega Port', 'Sengkang Depot', 'Kim Chuan Depot', 'Tuas Depot', 'Gali Batu Depot'],
    'Singapore Shopping': ['Takashimaya Area', 'ION Orchard Area', 'Paragon Area', 'Wisma Atria Area', 'Ngee Ann City Area', '313 Somerset Area', 'Orchard Central Area', 'Plaza Singapura Area', 'VivoCity Area', 'Suntec City Area', 'Marina Square Area', 'Millenia Walk Area', 'Raffles City Area', 'Bugis Junction Area', 'Bugis Plus Area', 'City Square Area', 'Mustafa Centre Area', 'IMM Area', 'Jem Area', 'Westgate Area'],
    'Singapore Nature': ['Bukit Timah Nature Reserve', 'Central Catchment', 'Sungei Buloh Wetland', 'Labrador Nature Reserve', 'Pasir Ris Mangrove', 'Berlayer Creek', 'Kranji Marshes', 'Chestnut Nature Park', 'Zhenghua Nature Park', 'Dairy Farm Nature Park', 'Hindhede Nature Park', 'Windsor Nature Park', 'Lower Peirce Trail', 'MacRitchie Trail', 'TreeTop Walk Area', 'Jelutong Tower Area', 'Golf Link Area', 'Island Club Area', 'Rifle Range Area', 'Bukit Batok Nature Park'],
    'Singapore Residential 1': ['Ardmore', 'Claymore', 'Anderson', 'Orange Grove', 'Lady Hill', 'Nassim', 'Cluny', 'Gallop', 'Woollerton', 'Tyersall', 'Jervois', 'Chatsworth', 'Bishopsgate', 'Nathan', 'Rochalie', 'Cable', 'Carlyle', 'Mount Echo', 'Tanglin', 'Ridley'],
    'Singapore Residential 2': ['Dalvey', 'White House', 'Stevens', 'Balmoral', 'Ewe Boon', 'Goodwood', 'Cairnhill', 'Monks Hill', 'Elizabeth Heights', 'Sophia Road', 'Adis Road', 'Wilkie Road', 'Mackenzie Road', 'Handy Road', 'Prinsep', 'Selegie', 'Short Street', 'Kirk Terrace', 'Dhoby Ghaut Area', 'Bencoolen'],
    'Singapore Residential 3': ['Watten', 'Shelford', 'Dunearn', 'Adam Road', 'Greenwood', 'Hillcrest', 'Park Vale', 'Arcadia', 'Coronation', 'Victoria Park', 'Prince of Wales', 'Duchess', 'Kings Road', 'Queens Road', 'Lutheran', 'Namly', 'Sixth Avenue', 'Garlick', 'Brizay', 'Old Holland'],
    'Singapore Residential 4': ['Binjai', 'Swiss Club', 'Yarwood', 'Denistone', 'Kilburn', 'Eng Neo', 'Vanda', 'Linden', 'Oriole', 'Cassia', 'Sunset Ave', 'Clementi Park', 'Brookvale', 'Freely', 'Majestic', 'Beauty World Area', 'Toh Tuck', 'Eng Kong', 'Lorong Kismis', 'Burgley'],
    'Singapore Residential 5': ['Thomson Rise', 'Thomson Ridge', 'Lakeview', 'Marymount', 'Shunfu', 'Sin Ming', 'Bright Hill', 'Fulton', 'Jalan Pintau', 'Jalan Pemimpin', 'Bishan St 21', 'Bishan St 13', 'Bishan St 12', 'Bishan St 11', 'Bishan St 24', 'Ang Mo Kio Ave 1', 'Ang Mo Kio Ave 3', 'Ang Mo Kio Ave 4', 'Ang Mo Kio Ave 5', 'Ang Mo Kio Ave 10'],
    'Singapore Tech': ['DBS Asia Hub', 'OCBC Centre', 'UOB Plaza', 'Mapletree Business City', 'PSA Building', 'HarbourFront Centre', 'Alexandra Technopark', 'Fragrance Empire', 'Keppel Bay Tower', 'Bank of China', 'Maybank Tower', 'Standard Chartered Changi', 'Citibank Changi', 'HSBC Collyer', 'Google Pasir Panjang', 'Facebook Marina One', 'Amazon Marina One', 'Microsoft Frasers', 'Shopee Science Park', 'Grab One North']
  },
  'Germany': {
    'Berlin': ['Mitte', 'Kreuzberg', 'Charlottenburg', 'Prenzlauer Berg', 'Friedrichshain', 'Schöneberg', 'Neukölln', 'Wedding', 'Tiergarten', 'Moabit', 'Wilmersdorf', 'Steglitz', 'Zehlendorf', 'Pankow', 'Reinickendorf', 'Spandau', 'Lichtenberg', 'Marzahn', 'Hellersdorf', 'Treptow'],
    'Munich': ['Altstadt', 'Maxvorstadt', 'Schwabing', 'Isarvorstadt', 'Ludwigsvorstadt', 'Haidhausen', 'Bogenhausen', 'Neuhausen', 'Nymphenburg', 'Sendling', 'Giesing', 'Thalkirchen', 'Laim', 'Pasing', 'Obermenzing', 'Aubing', 'Moosach', 'Milbertshofen', 'Freimann', 'Trudering'],
    'Hamburg': ['Altona', 'Eimsbüttel', 'Eppendorf', 'Winterhude', 'Uhlenhorst', 'Barmbek', 'Wandsbek', 'Bergedorf', 'Harburg', 'Wilhelmsburg', 'St Pauli', 'Sternschanze', 'Ottensen', 'Blankenese', 'Rahlstedt', 'Billstedt', 'Niendorf', 'Schnelsen', 'Langenhorn', 'Fuhlsbüttel'],
    'Frankfurt': ['Innenstadt', 'Westend', 'Nordend', 'Sachsenhausen', 'Bornheim', 'Bockenheim', 'Gallus', 'Ostend', 'Höchst', 'Griesheim', 'Niederrad', 'Oberrad', 'Riederwald', 'Fechenheim', 'Seckbach', 'Bergen-Enkheim', 'Preungesheim', 'Eckenheim', 'Dornbusch', 'Ginnheim'],
    'Cologne': ['Altstadt-Nord', 'Altstadt-Süd', 'Neustadt-Nord', 'Neustadt-Süd', 'Deutz', 'Ehrenfeld', 'Nippes', 'Lindenthal', 'Sülz', 'Klettenberg', 'Zollstock', 'Bayenthal', 'Marienburg', 'Rodenkirchen', 'Porz', 'Kalk', 'Mülheim', 'Chorweiler', 'Riehl', 'Niehl'],
    'Stuttgart': ['Stuttgart-Mitte', 'Stuttgart-Nord', 'Stuttgart-Ost', 'Stuttgart-Süd', 'Stuttgart-West', 'Bad Cannstatt', 'Degerloch', 'Vaihingen', 'Zuffenhausen', 'Feuerbach', 'Möhringen', 'Stammheim', 'Botnang', 'Hedelfingen', 'Obertürkheim', 'Untertürkheim', 'Wangen', 'Sillenbuch', 'Birkach', 'Plieningen'],
    'Dusseldorf': ['Altstadt', 'Carlstadt', 'Stadtmitte', 'Pempelfort', 'Derendorf', 'Golzheim', 'Stockum', 'Lohausen', 'Kaiserswerth', 'Angermund', 'Wittlaer', 'Kalkum', 'Unterrath', 'Rath', 'Mörsenbroich', 'Grafenberg', 'Ludenberg', 'Gerresheim', 'Hubbelrath', 'Knittkuhl'],
    'Dortmund': ['Innenstadt-West', 'Innenstadt-Ost', 'Innenstadt-Nord', 'Eving', 'Scharnhorst', 'Brackel', 'Aplerbeck', 'Hörde', 'Hombruch', 'Lütgendortmund', 'Huckarde', 'Mengede', 'Dorstfeld', 'Körne', 'Wambel', 'Asseln', 'Wickede', 'Benninghofen', 'Holzen', 'Syburg'],
    'Essen': ['Stadtkern', 'Südviertel', 'Rüttenscheid', 'Holsterhausen', 'Altendorf', 'Frohnhausen', 'Westviertel', 'Nordviertel', 'Ostviertel', 'Stoppenberg', 'Schonnebeck', 'Katernberg', 'Altenessen', 'Kray', 'Steele', 'Überruhr', 'Heisingen', 'Bredeney', 'Werden', 'Kettwig'],
    'Leipzig': ['Zentrum', 'Zentrum-Nord', 'Zentrum-Ost', 'Zentrum-Süd', 'Zentrum-West', 'Gohlis', 'Eutritzsch', 'Schönefeld', 'Mockau', 'Thekla', 'Sellerhausen', 'Reudnitz', 'Connewitz', 'Marienbrunn', 'Lößnig', 'Plagwitz', 'Lindenau', 'Leutzsch', 'Böhlitz-Ehrenberg', 'Grünau'],
    'Bremen': ['Mitte', 'Häfen', 'Neustadt', 'Obervieland', 'Huchting', 'Walle', 'Findorff', 'Utbremen', 'Steffensweg', 'Westend', 'Gröpelingen', 'Osterholz', 'Hemelingen', 'Vahr', 'Horn-Lehe', 'Borgfeld', 'Oberneuland', 'Schwachhausen', 'Findorff', 'Seehausen'],
    'Dresden': ['Innere Altstadt', 'Pirnaische Vorstadt', 'Seevorstadt', 'Wilsdruffer Vorstadt', 'Friedrichstadt', 'Äußere Neustadt', 'Innere Neustadt', 'Albertstadt', 'Pieschen', 'Trachau', 'Mickten', 'Klotzsche', 'Hellerau', 'Loschwitz', 'Wachwitz', 'Blasewitz', 'Striesen', 'Plauen', 'Gorbitz', 'Prohlis'],
    'Hanover': ['Mitte', 'Vahrenwald', 'List', 'Oststadt', 'Zoo', 'Kleefeld', 'Misburg', 'Anderten', 'Kirchrode', 'Bemerode', 'Wülferode', 'Südstadt', 'Döhren', 'Ricklingen', 'Linden', 'Limmer', 'Ahlem', 'Badenstedt', 'Davenstedt', 'Herrenhausen'],
    'Nuremberg': ['Altstadt', 'Marienvorstadt', 'Gärten b.d.W.', 'Gärten h.d.V.', 'St. Johannis', 'St. Peter', 'St. Leonhard', 'Schweinau', 'Gibitzenhof', 'Hummelstein', 'Gugelstraße', 'Steinbühl', 'Galgenhof', 'Bleiweiß', 'Gleißhammer', 'Zerzabelshof', 'Mögeldorf', 'Schoppershof', 'Wöhrd', 'Maxfeld'],
    'Duisburg': ['Altstadt', 'Dellviertel', 'Duissern', 'Neudorf', 'Wanheimerort', 'Hochfeld', 'Wanheim-Angerhausen', 'Huckingen', 'Mündelheim', 'Ungelsheim', 'Serm', 'Ehingen', 'Großenbaum', 'Rahm', 'Wedau', 'Bissingheim', 'Buchholz', 'Wanheimerort', 'Rheinhausen', 'Homberg'],
    'Bochum': ['Innenstadt', 'Grumme', 'Hamme', 'Hordel', 'Hofstede', 'Riemke', 'Altenbochum', 'Laer', 'Werne', 'Langendreer', 'Querenburg', 'Stiepel', 'Wiemelhausen', 'Weitmar', 'Wattenscheid', 'Günnigfeld', 'Höntrop', 'Eppendorf', 'Munscheid', 'Sevinghausen'],
    'Wuppertal': ['Elberfeld', 'Barmen', 'Cronenberg', 'Langerfeld-Beyenburg', 'Ronsdorf', 'Uellendahl-Katernberg', 'Vohwinkel', 'Heckinghausen', 'Oberbarmen', 'Wichlinghausen', 'Nächstebreck', 'Nordstadt', 'Südstadt', 'Weststadt', 'Oststadt', 'Zentrum', 'Hatzfeld', 'Dönberg', 'Lichtscheid', 'Beyeröhde'],
    'Bielefeld': ['Mitte', 'Schildesche', 'Gadderbaum', 'Brackwede', 'Senne', 'Sennestadt', 'Heepen', 'Jöllenbeck', 'Stieghorst', 'Dornberg', 'Babenhausen', 'Milse', 'Altenhagen', 'Lämershagen', 'Hillegossen', 'Ubedissen', 'Oldentrup', 'Sieker', 'Brönninghausen', 'Gräfinghagen'],
    'Bonn': ['Bonn-Zentrum', 'Bad Godesberg', 'Beuel', 'Hardtberg', 'Poppelsdorf', 'Endenich', 'Kessenich', 'Dottendorf', 'Gronau', 'Venusberg', 'Ippendorf', 'Röttgen', 'Ückesdorf', 'Lessnich', 'Duisdorf', 'Lengsdorf', 'Brüser Berg', 'Plittersdorf', 'Rüngsdorf', 'Mehlem'],
    'Munster': ['Altstadt', 'Schlossviertel', 'Kreuzviertel', 'Mauritz', 'Aaseestadt', 'Pluggendorf', 'Geistviertel', 'Gremmendorf', 'Angelmodde', 'Wolbeck', 'Handorf', 'Gelmer', 'Kinderhaus', 'Coerde', 'Sprakel', 'Nienberge', 'Roxel', 'Albachten', 'Mecklenbeck', 'Hiltrup']
  },
  'France': {
    'Paris': ['1st Arr.', '2nd Arr.', '3rd Arr.', '4th Arr.', '5th Arr.', '6th Arr.', '7th Arr.', '8th Arr.', '9th Arr.', '10th Arr.', '11th Arr.', '12th Arr.', '13th Arr.', '14th Arr.', '15th Arr.', '16th Arr.', '17th Arr.', '18th Arr.', '19th Arr.', '20th Arr.'],
    'Marseille': ['Vieux-Port', 'Le Panier', 'La Joliette', 'Saint-Charles', 'Noailles', 'La Plaine', 'Cours Julien', 'Belsunce', 'Endoume', 'Le Pharo', 'Castellane', 'Perier', 'Saint-Giniez', 'Le Roucas-Blanc', 'Prado', 'Mazargues', 'Luminy', 'Estaque', 'Les Goudes', 'Château-Gombert'],
    'Lyon': ['Presqu\'île', 'Vieux Lyon', 'Croix-Rousse', 'Fourvière', 'Part-Dieu', 'Brotteaux', 'Cité Internationale', 'Confluence', 'Guillotière', 'Gerland', 'Monplaisir', 'États-Unis', 'Vaise', 'Duchère', 'Mermoz', 'Bachut', 'Montchat', 'Perrache', 'Bellecour', 'Cordeliers'],
    'Toulouse': ['Capitole', 'Saint-Cyprien', 'Carmes', 'Saint-Étienne', 'Jean-Jaurès', 'Matabiau', 'Marengo', 'Jolimont', 'Côte Pavée', 'Rangueil', 'Empalot', 'Saint-Agne', 'Lardenne', 'Saint-Simon', 'Basso-Cambo', 'Purpan', 'Minimes', 'Bonnefoy', 'Roseraie', 'Compans-Caffarelli'],
    'Nice': ['Vieux Nice', 'Le Port', 'Place Garibaldi', 'Place Masséna', 'Jean-Médecin', 'Libération', 'Cimiez', 'Mont Boron', 'Fabron', 'Magnan', 'Arenas', 'Saint-Isidore', 'Lingostière', 'Gairaut', 'Ariane', 'Pasteur', 'Riquier', 'Carabacel', 'Vernier', 'Gambetta'],
    'Nantes': ['Centre-ville', 'Bouffay', 'Graslin', 'Île de Nantes', 'Chantenay', 'Dervallières', 'Zola', 'Hauts-Pavés', 'Saint-Pasquier', 'Breil', 'Barberie', 'Nantes Erdre', 'Doulon', 'Bottière', 'Nantes Sud', 'Rezé border', 'Saint-Herblain border', 'Orvault border', 'Carquefou border', 'Sainte-Luce border'],
    'Strasbourg': ['Grande Île', 'Petite France', 'Krutenau', 'Neudorf', 'Meinau', 'Cronenbourg', 'Koenigshoffen', 'Robertsau', 'Orangerie', 'Contades', 'Tribunal', 'Gare', 'Esplanade', 'Bourse', 'Hautepierre', 'Elsau', 'Montagne Verte', 'Port du Rhin', 'Neuhof', 'Stockfeld'],
    'Montpellier': ['Écusson', 'Antigone', 'Beaux-Arts', 'Boutonnet', 'Arceaux', 'Figuerolles', 'Gambetta', 'Port Marianne', 'Odysseum', 'Aiguelongue', 'Père Soulas', 'Euromédecine', 'Malbosc', 'La Paillade', 'Celleneuve', 'Ovalie', 'Estanove', 'Grisettes', 'Millénaire', 'Garosud'],
    'Bordeaux': ['Saint-Pierre', 'Saint-Michel', 'Sainte-Croix', 'Victoire', 'Hôtel de Ville', 'Quinconces', 'Chartrons', 'Bacalan', 'Bastide', 'Nansouty', 'Saint-Genès', 'Mériadeck', 'Saint-Seurin', 'Fondaudège', 'Jardin Public', 'Grand Parc', 'Caudeŕan', 'Saint-Augustin', 'Gare Saint-Jean', 'Belcier'],
    'Lille': ['Vieux-Lille', 'Centre-ville', 'Wazemmes', 'Vauban', 'Esquermes', 'Bois-Blancs', 'Moulins', 'Saint-Maurice Pellevoisin', 'Fives', 'Hellemmes', 'Lille-Sud', 'Faubourg de Béthune', 'Euralille', 'Grand Palais', 'Rihour', 'Gare Lille-Flandres', 'Gare Lille-Europe', 'Cormontaigne', 'Port de Lille', 'Citadelle'],
    'Rennes': ['Centre-ville', 'Colombier', 'Sainte-Thérèse', 'Bourg-l\'Évesque', 'Villejean', 'Beaulieu', 'Courrouze', 'Cleunay', 'Bréquigny', 'Le Blosne', 'Poterie', 'Francisco-Ferrer', 'Landry', 'Saint-Hélier', 'Thabor', 'Saint-Martin', 'Maurepas', 'Patton', 'Bellangerais', 'Longs-Champs'],
    'Reims': ['Centre-ville', 'Boulingrin', 'Cernay', 'Jean-Jaurès', 'Épinettes', 'Clairmarais', 'Charles Arnould', 'Laon-Sud', 'Tinqueux border', 'Courlancy', 'Sainte-Anne', 'Clemenceau', 'Murigny', 'Croix-Rouge', 'Orgeval', 'Bétheny border', 'Saint-Remi', 'Pomméry', 'Verrerie', 'Val de Murigny'],
    'Le Havre': ['Centre-ville Reconstruit', 'Saint-François', 'Notre-Dame', 'Perret', 'Sainte-Anne', 'Sanvic', 'Bléville', 'Dollemard', 'Côte Ouest', 'Graville', 'Soquence', 'Caucriauville', 'Mont-Gaillard', 'Aplemont', 'Mare Rouge', 'Eure', 'Brindeau', 'Vallée Béreult', 'Les Ormeaux', 'Gare'],
    'Saint-Etienne': ['Hôtel de Ville', 'Peuple', 'Jean Jaurès', 'Châteaucreux', 'Bellevue', 'La Métare', 'Terrenoire', 'Montreynaud', 'Bergson', 'Carnot', 'Saint-Roch', 'Badouillère', 'Jacquard', 'Bizillon', 'Cours Fauriel', 'Vivaraize', 'Monthieu', 'La Terrasse', 'Soleil', 'Le Crêt de Roc'],
    'Toulon': ['Centre-ville', 'Mourillon', 'Pont-du-Las', 'Saint-Jean-du-Var', 'La Rode', 'Aguillon', 'Sainte-Anne', 'Faron', 'Claret', 'Sybille', 'Valbourdin', 'Quatre Chemins', 'Valbertrand', 'Les Routes', 'Cap Brun', 'Petit Bois', 'Serinette', 'Bon Rencontre', 'La Florane', 'Le Jonquet'],
    'Grenoble': ['Hyper-centre', 'Europole', 'Berriat', 'Saint-Bruno', 'Eaux-Claires', 'Grands Boulevards', 'Championnet', 'Île Verte', 'La Tronche border', 'Mounier', 'Bajatière', 'Capuche', 'Malherbe', 'Villeneuve', 'Arlequin', 'Constantine', 'Teisseire', 'Abbaye', 'Jouhaux', 'Vigny-Musset'],
    'Dijon': ['Centre-ville', 'Faubourg North', 'Faubourg South', 'Montchapet', 'Victor-Hugo', 'Fontaine-lès-Dijon border', 'Toison d\'Or', 'Grésilles', 'Parc', 'Chevreul', 'Bourroches', 'Larrey', 'Valendons', 'Fontaine d\'Ouche', 'Talant border', 'Chenôve border', 'Quetigny border', 'Saint-Apollinaire border', 'Longvic border', 'Université'],
    'Angers': ['Centre-ville', 'La Fayette', 'Eblé', 'Doutre', 'Saint-Jacques', 'Nazareth', 'Monplaisir', 'Deux-Croix', 'Banchais', 'Belle-Beille', 'Lac de Maine', 'Roseraie', 'Orgemont', 'Justices', 'Madeleine', 'Saint-Léonard', 'Avrillé border', 'Trélazé border', 'Ponts-de-Cé border', 'Beaucouzé border'],
    'Villeurbanne': ['Gratte-Ciel', 'Charpennes', 'Tonkin', 'Buers', 'Croix-Luizet', 'Doua', 'Grandclément', 'Cyprian', 'Les Brosses', 'Ferrandière', 'Maisons Neuves', 'Perralière', 'Château Gaillard', 'Saint-Jean', 'Flachet', 'Dedieu', 'Charmettes', 'Bellecombe', 'République', 'Tolstoï'],
    'Nimes': ['Centre-ville', 'Écusson', 'Arènes', 'Feuchères', 'Gambetta', 'Richelieu', 'Cadereau', 'Jean-Jaurès', 'Mont Duplan', 'Garrigues', 'Courbessac', 'Castanet', 'Vacquerolles', 'Pissevin', 'Valdegour', 'Chemin Bas d\'Avignon', 'Mas de Mingue', 'Saint-Césaire', 'Costières', 'Caissargues border']
  },
  'China': {
    'Shanghai': ['Pudong', 'Lujiazui', 'Jing\'an', 'Xuhui', 'Huangpu', 'The Bund', 'French Concession', 'Changning', 'Putuo', 'Hongkou', 'Yangpu', 'Minhang', 'Baoshan', 'Jiading', 'Songjiang', 'Qingpu', 'Fengxian', 'Jinshan', 'Chongming', 'Zhabei', 'Wujiaochang'],
    'Beijing': ['Chaoyang', 'Haidian', 'Xicheng', 'Dongcheng', 'Fengtai', 'Shijingshan', 'Tongzhou', 'Shunyi', 'Changping', 'Daxing', 'Mentougou', 'Fangshan', 'Pinggu', 'Huairou', 'Miyun', 'Yanqing', 'Sanlitun', 'Guomao', 'Wangfujing', 'Zhongguancun', 'CBD'],
    'Guangzhou': ['Tianhe', 'Yuexiu', 'Liwan', 'Haizhu', 'Baiyun', 'Huangpu', 'Panyu', 'Huadu', 'Nansha', 'Conghua', 'Zengcheng', 'Zhujiang New Town', 'Taojin', 'Dongshan', 'Wushan', 'Xiguan', 'Pazhou', 'Science City', 'University City', 'Guangzhou South'],
    'Shenzhen': ['Futian', 'Nanshan', 'Luohu', 'Bao\'an', 'Longgang', 'Longhua', 'Pingshan', 'Guangming', 'Yantian', 'Dapeng', 'Shekou', 'Huaqiangbei', 'Chegongmiao', 'Science Park', 'Qianhai', 'Houhai', 'OCT', 'Bantian', 'Longhua New Town', 'Shajing'],
    'Tianjin': ['Heping', 'Hexi', 'Nankai', 'Hedong', 'Hebei', 'Hongqiao', 'Binhai', 'Dongli', 'Xiqing', 'Jinnan', 'Beichen', 'Wuqing', 'Baodi', 'Ninghe', 'Jizhou', 'Jinghai', 'Tanggu', 'Hangu', 'Dagang', 'TEDA'],
    'Chengdu': ['Jinjiang', 'Qingyang', 'Jinniu', 'Wuhou', 'Chenghua', 'Gaoxin', 'Tianfu New Area', 'Longquanyi', 'Qingbaijiang', 'Xindu', 'Wenjiang', 'Shuangliu', 'Pidu', 'Xinjin', 'Dujiangyan', 'Pengzhou', 'Qionglai', 'Chongzhou', 'Jianyang', 'Kuanzhai Alley'],
    'Wuhan': ['Jiang\'an', 'Jianghan', 'Qiaokou', 'Hanyang', 'Wuchang', 'Qingshan', 'Hongshan', 'Caidian', 'Jiangxia', 'Huangpi', 'Xinzhou', 'Dongxihu', 'Hannan', 'Optics Valley', 'Hankou', 'Wuchang Binjiang', 'Zhuankou', 'Panlongcheng', 'Houhu', 'Nanhu'],
    'Hangzhou': ['Shangcheng', 'Xiacheng', 'Gongshu', 'Xihu', 'Binjiang', 'Xiaoshan', 'Yuhang', 'Fuyang', 'Lin\'an', 'Linjiang', 'Qiantang', 'West Lake Area', 'Wulin', 'Qianjiang New Town', 'Alibaba Xixi', 'Dream Town', 'Future Sci-Tech City', 'Xiasha', 'Gongshu North', 'Liangzhu'],
    'Chongqing': ['Yuzhong', 'Jiangbei', 'Nan\'an', 'Jiulongpo', 'Shapingba', 'Dadukou', 'Beibei', 'Yubei', 'Ba\'nan', 'Liangjiang New Area', 'Wanzhou', 'Fuling', 'Bibi', 'Tongnan', 'Tongliang', 'Dazu', 'Rongchang', 'Bishan', 'Liangping', 'Chengkou'],
    'Nanjing': ['Xuanwu', 'Qinhuai', 'Jianye', 'Gulou', 'Pukou', 'Qixia', 'Yuhuatai', 'Jiangning', 'Luhe', 'Lishui', 'Gaochun', 'Xinjiekou', 'Hexi CBD', 'Nanjing South', 'Jiangbei New Area', 'Xianlin', 'Pukou High-tech', 'Qixia Port', 'Yuhai', 'Fuzimiao'],
    'Xi\'an': ['Beilin', 'Xincheng', 'Lianhu', 'Yanta', 'Bahe', 'Weiyang', 'Yanliang', 'Lintong', 'Chang\'an', 'Gaoling', 'Huyì', 'High-tech Zone', 'Qujiang', 'Chanba', 'Fengdong', 'Jingkai', 'Aviation Base', 'International Port', 'Daming Palace', 'Bell Tower Area'],
    'Suzhou': ['Gusu', 'SIP', 'SND', 'Wuzhong', 'Xiangcheng', 'Wujiang', 'Changshu', 'Zhangjiagang', 'Kunshan', 'Taicang', 'Pingjiang Road', 'Shantang Street', 'Jinji Lake', 'Dushu Lake', 'Yangcheng Lake', 'Suzhou South', 'Mudu', 'Luzhi', 'Tongli', 'Zhouzhuang'],
    'Zhengzhou': ['Jinshui', 'Erqi', 'Guancheng', 'Zhongyuan', 'Huiji', 'Zhengdong New Area', 'High-tech Zone', 'Economic Zone', 'Airport Zone', 'Xingyang', 'Xinmi', 'Xinzheng', 'Dengfeng', 'Gongyi', 'Zhongmu', 'Shangjie', 'Garden Road', 'Zijingshan', 'Erqi Square', 'Longhu'],
    'Changsha': ['Furong', 'Tianxin', 'Yuelu', 'Kaifu', 'Yuhua', 'Wangcheng', 'Changsha County', 'Liuyang', 'Ningxiang', 'Wuyi Square', 'Meixi Lake', 'Yanghu', 'Binjiang New Area', 'High-tech Park', 'Economic Development', 'South Railway Station', 'Huanghua Airport', 'Xingsha', 'Yuelu Mountain', 'Orange Isle'],
    'Shenyang': ['Heping', 'Shenhe', 'Dadong', 'Huanggu', 'Tiexi', 'Sujiatun', 'Hunnan', 'Shenbei', 'Yuhong', 'Liaozhong', 'Xinmin', 'Faku', 'Kangping', 'Zhongjie', 'Taiyuan Street', 'Wulihe', 'Beiling', 'Dongling', 'Qigong', 'Xinggong'],
    'Qingdao': ['Shinan', 'Shibei', 'Licang', 'Laoshan', 'Chengyang', 'Huangdao', 'Jimo', 'Jiaozhou', 'Pingdu', 'Laixi', 'May Fourth Square', 'Zhongshan Road', 'Badaguan', 'Qingdao Port', 'High-tech Zone', 'Blue Valley', 'Xihai\'an', 'Shandong Road', 'Hong Kong Road', 'Taihang Mountain Road'],
    'Fuzhou': ['Gulou', 'Taijiang', 'Cangshan', 'Mawei', 'Jin\'an', 'Changle', 'Minhou', 'Lianjiang', 'Luoyuan', 'Minqing', 'Yongtai', 'Fuqing', 'Wuyi Square', 'Dongjieko', 'Bailong', 'Jinshan', 'Kuai\'an', 'Langqi', 'Gui\'an', 'Pingtan'],
    'Hefei': ['Luyang', 'Yaohai', 'Shushun', 'Baohe', 'High-tech Zone', 'Economic Zone', 'Xinzhan', 'Binhu New Area', 'Feidong', 'Feixi', 'Changfeng', 'Lujiang', 'Chaohu', 'Sanhua', 'Mengcheng Road', 'Huizhou Avenue', 'Changjiang Road', 'Jinzhai Road', 'Wuhu Road', 'Swan Lake'],
    'Harbin': ['Daoli', 'Nangang', 'Daowai', 'Xiangfang', 'Pingfang', 'Songbei', 'Hulan', 'Acheng', 'Shuangcheng', 'Central Street', 'Sophia Square', 'Ice and Snow World', 'Sun Island', 'Harbin West', 'Harbin East', 'Qunli', 'Haxi', 'Limin', 'Development Zone', 'University City'],
    'Dalian': ['Zhongshan', 'Xigang', 'Shahekou', 'Ganjingzi', 'Lvshunkou', 'Jinzhou', 'Pulandian', 'Wafangdian', 'Zhuanghe', 'Changhai', 'Renmin Road', 'Xi\'an Road', 'Peace Plaza', 'High-tech Zone', 'Dalian Port', 'Tiger Beach', 'Xinghai Square', 'Golden Pebble Beach', 'Diamond Bay', 'Sports City']
  },
  'Japan': {
    'Tokyo': ['Shinjuku', 'Shibuya', 'Minato', 'Chuo', 'Chiyoda', 'Roppongi', 'Ginza', 'Akihabara', 'Harajuku', 'Ebisu', 'Meguro', 'Setagaya', 'Nakano', 'Suginami', 'Toshima', 'Bunkyo', 'Taito', 'Sumida', 'Koto', 'Shinagawa'],
    'Osaka': ['Umeda', 'Namba', 'Shinsaibashi', 'Tennoji', 'Yodoyabashi', 'Honmachi', 'Kyobashi', 'Shin-Osaka', 'Bay Area', 'Tsuruhashi', 'Dotonbori', 'Amerikamura', 'Abeno', 'Juso', 'Taisho', 'Suminoe', 'Higashinari', 'Ikuno', 'Asahi', 'Joto'],
    'Nagoya': ['Sakae', 'Meieki', 'Naka', 'Nakamura', 'Chikusa', 'Higashi', 'Showa', 'Mizuho', 'Atsuta', 'Nakagawa', 'Minato', 'Minami', 'Moriyama', 'Midori', 'Meito', 'Tenpaku', 'Osu', 'Kanayama', 'Fushimi', 'Joshin'],
    'Yokohama': ['Minato Mirai', 'Naka', 'Nishi', 'Kanagawa', 'Tsurumi', 'Hodogaya', 'Isogo', 'Kanazawa', 'Kohoku', 'Tsuzuki', 'Aoba', 'Midori', 'Seya', 'Izumi', 'Totsuka', 'Sakae', 'Chinatown', 'Motomachi', 'Yamashita Park', 'Sakuragicho'],
    'Fukuoka': ['Hakata', 'Tenjin', 'Chuo', 'Hakata-ekimae', 'Nakasu', 'Daimyo', 'Imaizumi', 'Kego', 'Akasaka', 'Ohori Park', 'Nishijin', 'Momochi', 'Sawara', 'Jonan', 'Minami', 'Higashi', 'Kasuya', 'Itoshima', 'Dazaifu', 'Kurume'],
    'Sapporo': ['Chuo', 'Kita', 'Higashi', 'Shiroishi', 'Toyohira', 'Minami', 'Nishi', 'Atsubetsu', 'Teine', 'Kiyota', 'Susukino', 'Odori', 'Sapporo Station', 'Maruyama', 'Kotoni', 'Shinkotoni', 'Asabu', 'Makomanai', 'Hiraoka', 'Shin-Sapporo'],
    'Kyoto': ['Nakagyo', 'Shimogyo', 'Kamigyo', 'Sakyo', 'Ukyo', 'Higashiyama', 'Yamashina', 'Fushimi', 'Minami', 'Nishikyo', 'Kita', 'Gion', 'Kawaramachi', 'Kyoto Station', 'Arashiyama', 'Pontocho', 'Kinkakuji Area', 'Kiyomizu Area', 'Uji', 'Kameoka'],
    'Kobe': ['Chuo', 'Hyogo', 'Nagata', 'Suma', 'Tarumi', 'Kita', 'Nishi', 'Nada', 'Higashinada', 'Sannomiya', 'Motomachi', 'Harborland', 'Kitano', 'Port Island', 'Rokko Island', 'Arima Onsen', 'Akashi border', 'Ashiya border', 'Nishinomiya border', 'Itami border'],
    'Kawasaki': ['Kawasaki-ku', 'Saiwai-ku', 'Nakahara-ku', 'Takatsu-ku', 'Tama-ku', 'Miyamae-ku', 'Asao-ku', 'Musashi-Kosugi', 'Mizonokuchi', 'Noborito', 'Shin-Yurigaoka', 'Shinkanzaki', 'Ogijima', 'Ukishima', 'Chidori', 'Yako', 'Shitte', 'Hama-Kawasaki', 'Oda', 'Asada'],
    'Saitama': ['Omiya', 'Urawa', 'Chuo', 'Minami', 'Midori', 'Iwatsuki', 'Minuma', 'Sakura', 'Nishi', 'Kita', 'Shintoshin', 'Musashi-Urawa', 'Kita-Urawa', 'Yono', 'Yono-Honmachi', 'Omiya-Koen', 'Miyahara', 'Nisshin', 'Sashigaya', 'Miyano'],
    'Hiroshima': ['Naka', 'Higashi', 'Minami', 'Nishi', 'Asaminami', 'Asakita', 'Aki', 'Saeki', 'Hondori', 'Hatchobori', 'Kamiyacho', 'Hiroshima Station', 'Peace Park Area', 'Danbara', 'Ushita', 'Koi', 'Itsukaichi', 'Kure', 'Higashi-Hiroshima', 'Hatsukaichi'],
    'Sendai': ['Aoba', 'Miyagino', 'Wakabayashi', 'Taihaku', 'Izumi', 'Sendai Station', 'Ichibancho', 'Kokubuncho', 'Nagamachi', 'Izumi-Chuo', 'Kotodai-Koen', 'Tsutsujigaoka', 'Oroshimachi', 'Yagiyama', 'Ayashi', 'Nishi-Sendai', 'Tagajo', 'Shiogama', 'Natori', 'Iwanuma'],
    'Chiba': ['Chuo', 'Hanamigawa', 'Inage', 'Wakaba', 'Midori', 'Mihama', 'Makuhari', 'Chiba Station', 'Soga', 'Kamatori', 'Honda', 'Toke', 'Oyumi', 'Inage-Kaigan', 'Kemigawa', 'Makuhari-Hongo', 'Kaihin-Makuhari', 'Tsuga', 'Sakura border', 'Narashino border'],
    'Kitakyushu': ['Moji', 'Wakamatsu', 'Tobata', 'Kokurakita', 'Kokuraminami', 'Yahatahigashi', 'Yahatanishi', 'Kokura Station', 'Kurosaki', 'Orio', 'Mojiko', 'Aeon Mall Yahata', 'Riverwalk Kokura', 'Tanga Market', 'Bashaku', 'Sunatsu', 'Minojima', 'Shinozaki', 'Adachi', 'Tomino'],
    'Sakai': ['Sakai-ku', 'Naka-ku', 'Higashi-ku', 'Nishi-ku', 'Minami-ku', 'Kita-ku', 'Mihara-ku', 'Sakai-Higashi', 'Sakai-shi', 'Mikunigaoka', 'Nakamozu', 'Shinkanaoka', 'Komyokeike', 'Izumigaoka', 'Toga-Mikita', 'Otori', 'Hamadera', 'Tsukuno', 'Uenoshiba', 'Mozu'],
    'Hamamatsu': ['Naka', 'Higashi', 'Nishi', 'Minami', 'Kita', 'Hamakita', 'Tenryu', 'Hamamatsu Station', 'Act City Area', 'Zaza City Area', 'Sanaru Lake Area', 'Makata', 'Aritama', 'Ichino', 'Kamijima', 'Hikuma', 'Takaoka', 'Aoi', 'Wajiyama', 'Tomitsuka'],
    'Shizuoka': ['Aoi', 'Suruga', 'Shimizu', 'Shizuoka Station', 'Gofukucho', 'Konyacho', 'Shin-Shizuoka', 'Kusanagi', 'Kusanagi-Higashi', 'Shimizu-ku', 'Miho', 'Nihondaira', 'Kuni-Yoshida', 'Oshika', 'Naka-Yoshida', 'Minami-Abe', 'Warashina', 'Utogi', 'Umegashima', 'Ikawa'],
    'Sagamihara': ['Midori', 'Chuo', 'Minami', 'Hashimoto', 'Sagamihara Station', 'Sagamiono', 'Kobuchi', 'Fuchinobe', 'Yabe', 'Kamimizo', 'Chiyoda', 'Hoshigaoka', 'Yokoyama', 'Tana', 'Aikawa border', 'Zama border', 'Yamato border', 'Machida border', 'Tsukui', 'Shiroyama'],
    'Okayama': ['Kita', 'Naka', 'Higashi', 'Minami', 'Okayama Station', 'Omotecho', 'Korakuen Area', 'Tsushima', 'Hokancho', 'Ishishima', 'Saidaiji', 'Konan', 'Fujiwara', 'Takaya', 'Takayanagi', 'Kibi', 'Ashimori', 'Takebe', 'Seto', 'Kurashiki border'],
    'Kumamoto': ['Chuo', 'Higashi', 'Nishi', 'Minami', 'Kita', 'Kumamoto Castle Area', 'Shimotori', 'Kamitori', 'Suizenji', 'Musashigaoka', 'Tatsuda', 'Shimizu', 'Kengun', 'Obiyama', 'Izumi', 'Tamukae', 'Chikami', 'Takahira', 'Hananoki', 'Ueki']
  },
  'Brazil': {
    'Sao Paulo': ['Avenida Paulista', 'Itaim Bibi', 'Vila Olimpia', 'Pinheiros', 'Jardins', 'Moema', 'Brooklin', 'Vila Madalena', 'Centro', 'Bela Vista', 'Perdizes', 'Higienopolis', 'Santa Cecilia', 'Barra Funda', 'Santana', 'Tatuape', 'Mooca', 'Ipiranga', 'Saude', 'Morumbi'],
    'Rio de Janeiro': ['Copacabana', 'Ipanema', 'Leblon', 'Barra da Tijuca', 'Botafogo', 'Flamengo', 'Centro', 'Lapa', 'Santa Teresa', 'Tijuca', 'Meier', 'Madureira', 'Jacarepagua', 'Recreio', 'Gavea', 'Humaita', 'Urca', 'Gloria', 'Catete', 'Sao Conrado'],
    'Brasilia': ['Asa Sul', 'Asa Norte', 'Lago Sul', 'Lago Norte', 'Sudoeste', 'Noroeste', 'Cruzeiro', 'Guara', 'Aguas Claras', 'Taguatinga', 'Ceilandia', 'Samambaia', 'Sobradinho', 'Planaltina', 'Gama', 'Santa Maria', 'Nucleo Bandeirante', 'Candangolandia', 'Park Way', 'Vila Planalto'],
    'Salvador': ['Pelourinho', 'Barra', 'Ondina', 'Rio Vermelho', 'Pituba', 'Itaigara', 'Caminho das Arvores', 'Vitoria', 'Graca', 'Canela', 'Garcia', 'Federracao', 'Engenho Velho', 'Brotas', 'Cabula', 'Imbui', 'Stiep', 'Costa Azul', 'Piatã', 'Itapuã'],
    'Fortaleza': ['Meireles', 'Aldeota', 'Mucuripe', 'Praia de Iracema', 'Centro', 'Dionisio Torres', 'Cocó', 'Papicu', 'Guararapes', 'Edson Queiroz', 'Cidade Funcionarios', 'Parangaba', 'Messejana', 'Maraponga', 'Fátima', 'Benfica', 'Joaquim Tavora', 'Varjota', 'Montese', 'Passaré'],
    'Belo Horizonte': ['Savassi', 'Lourdes', 'Funcionarios', 'Centro', 'Belvedere', 'Sion', 'Anchieta', 'Cruzeiro', 'Carmo', 'Santo Antonio', 'Sao Pedro', 'Padre Eustaquio', 'Coreu', 'Castelo', 'Buritis', 'Santa Efigenia', 'Santa Tereza', 'Floresta', 'Prado', 'Barro Preto'],
    'Manaus': ['Adrianopolis', 'Vieiralves', 'Ponta Negra', 'Centro', 'Nossa Senhora das Gracas', 'Aleixo', 'Parque 10', 'Dom Pedro', 'Ponta Negra', 'Taruma', 'Compensa', 'Sao Raimundo', 'Gloria', 'Aparecida', 'Cachoeirinha', 'Praça 14', 'Japiim', 'Coroado', 'Distrito Industrial', 'Cidade Nova'],
    'Curitiba': ['Batel', 'Centro', 'Centro Civico', 'Bigorrilho', 'Champagnat', 'Agua Verde', 'Vila Izabel', 'Santa Quiteria', 'Portao', 'Novo Mundo', 'Capao Raso', 'Pinheirinho', 'Boqueirao', 'Uberaba', 'Jardim das Americas', 'Cristo Rei', 'Cabral', 'Juveve', 'Ahú', 'Boa Vista'],
    'Recife': ['Boa Viagem', 'Pina', 'Setubal', 'Centro', 'Recife Antigo', 'Santo Antonio', 'Sao Jose', 'Boa Vista', 'Derby', 'Graças', 'Espinheiro', 'Aflitos', 'Jaqueira', 'Casa Forte', 'Parnamirim', 'Casa Amarela', 'Madalena', 'Torre', 'Caxangá', 'Imbiribeira'],
    'Porto Alegre': ['Moinhos de Vento', 'Bela Vista', 'Petropolis', 'Centro Historico', 'Cidade Baixa', 'Menino Deus', 'Praia de Belas', 'Bom Fim', 'Rio Branco', 'Auxiliadora', 'Mont\'Serrat', 'Higienopolis', 'Passo d\'Areia', 'Boa Vista', 'Chacara das Pedras', 'Tres Figueiras', 'Ipanema', 'Tristeza', 'Vila Assuncao', 'Cavalhada'],
    'Belem': ['Nazare', 'Batista Campos', 'Umarizal', 'Reduto', 'Centro', 'Campina', 'Sao Bras', 'Canudos', 'Marco', 'Curió-Utinga', 'Souza', 'Marambaia', 'Val-de-Cans', 'Bengui', 'Tapanã', 'Icoaraci', 'Outeiro', 'Mosqueiro', 'Cidade Velha', 'Guama'],
    'Goiania': ['Setor Bueno', 'Setor Marista', 'Setor Oeste', 'Setor Sul', 'Setor Central', 'Setor Universitário', 'Setor Leste Vila Nova', 'Setor Pedro Ludovico', 'Jardim Goiás', 'Parque Amazônia', 'Setor Nova Suíça', 'Setor Bela Vista', 'Setor Serrinha', 'Setor Sudoeste', 'Setor Jardim América', 'Setor Coimbra', 'Setor Campinas', 'Setor Faiçalville', 'Setor Santa Genoveva', 'Setor Jaó'],
    'Guarulhos': ['Centro', 'Macedo', 'Vila Augusta', 'Gopouva', 'Maia', 'Picanço', 'Paraventi', 'Bom Clima', 'Cecap', 'Taboão', 'Cocaia', 'Bonsucesso', 'Pimentas', 'Cumbica', 'Adamastor', 'Torres Tibagy', 'Vila Galvão', 'Vila Rosália', 'Continental', 'Parque Renato Maia'],
    'Campinas': ['Cambuí', 'Centro', 'Guanabara', 'Castelo', 'Taquaral', 'Jardim Chapadão', 'Jardim Aurélia', 'Jardim Eulina', 'Vila Itapura', 'Vila Nova', 'Bonfim', 'Botafogo', 'Barão Geraldo', 'Sousas', 'Joaquim Egídio', 'Nova Aparecida', 'Parque Prado', 'Swiss Park', 'Mansões Santo Antônio', 'Jardim das Paineiras'],
    'Sao Luis': ['Ponta d\'Areia', 'Península', 'Calhau', 'Holandeses', 'Renascença', 'Jardim Apicum', 'Centro', 'Praia Grande', 'Cohafuma', 'Cohama', 'Cohatrac', 'Anjo da Guarda', 'Itaqui', 'Bacanga', 'Vila Embratel', 'Turu', 'Angelim', 'Bequimão', 'Vinhais', 'Olho d\'Água'],
    'Sao Goncalo': ['Centro', 'Alcântara', 'Neves', 'Venda da Cruz', 'Barreto', 'Mutuá', 'Mutondo', 'Galo Branco', 'Rocha', 'Lindo Parque', 'Zé Garoto', 'Brasilândia', 'Pita', 'Santa Catarina', 'Gradim', 'Porto Novo', 'Vila Três', 'Raul Veiga', 'Pacheco', 'Trindade'],
    'Maceio': ['Ponta Verde', 'Jatiuca', 'Pajuçara', 'Stella Maris', 'Centro', 'Jaraguá', 'Farol', 'Pinheiro', 'Gruta de Lourdes', 'Serraria', 'Antares', 'Benedito Bentes', 'Tabuleiro do Martins', 'Eustáquio Gomes', 'Santa Lúcia', 'Guaxuma', 'Garça Torta', 'Riacho Doce', 'Ipioca', 'Jacarecica'],
    'Duque de Caxias': ['Centro', 'Jardim 25 de Agosto', 'Vila Meriti', 'Parque Lafaiete', 'Parque Duque', 'Gramacho', 'Sarapuí', 'Campos Elíseos', 'Xerém', 'Imbariê', 'Santa Cruz da Serra', 'Chácaras Arcampo', 'Parque Beira Mar', 'Vila São Luiz', 'Parque Fluminense', 'Olímpico', 'Paulista', 'Pantanal', 'Figueira', 'Pilar'],
    'Natal': ['Ponta Negra', 'Capim Macio', 'Tirol', 'Petrópolis', 'Centro', 'Ribeira', 'Alecrim', 'Lagoa Nova', 'Candelária', 'Neópolis', 'Nova Parnamirim', 'Pajuçara', 'Potengi', 'Nossa Senhora da Apresentação', 'Igapó', 'Redinha', 'Areia Preta', 'Praia do Meio', 'Felipe Camarão', 'Cidade da Esperança'],
    'Campo Grande': ['Centro', 'Jardim dos Estados', 'Santa Fé', 'Itanhangá Park', 'Carandá Bosque', 'Chácara Cachoeira', 'Vivendas do Bosque', 'Monte Castelo', 'São Francisco', 'Vila Glória', 'Vila Carvalho', 'Amambaí', 'Cabreúva', 'Taveirópolis', 'Bela Vista', 'Tiradentes', 'Vilacity', 'Moreninhas', 'Aero Rancho', 'Nova Lima']
  },
  'Netherlands': {
    'Amsterdam': ['Zuidas', 'Grachtengordel', 'De Pijp', 'Jordaan', 'Oud-West', 'Oud-Zuid', 'Westerpark', 'Indische Buurt', 'Bos en Lommer', 'Slotervaart', 'Osdorp', 'Buitenveldert', 'IJburg', 'Noord', 'Zeeburg', 'Amstel', 'Watergraafsmeer', 'Rivierenbuurt', 'Hoofddorppleinbuurt', 'Spaarndammerbuurt'],
    'Rotterdam': ['Centrum', 'Kop van Zuid', 'Delfshaven', 'Kralingen', 'Crooswijk', 'Hillegersberg', 'Schiebroek', 'Overschie', 'Blijdorp', 'Bergpolder', 'Provenierswijk', 'Liskwartier', 'Katendrecht', 'Charlois', 'Feijenoord', 'IJsselmonde', 'Prins Alexander', 'Hoogvliet', 'Pernis', 'Rozenburg'],
    'The Hague': ['Centrum', 'Scheveningen', 'Kijkduin', 'Statenkwartier', 'Duinoord', 'Zeeheldenkwartier', 'Archipelbuurt', 'Willemspark', 'Bezuidenhout', 'Benoordenhout', 'Mariahoeve', 'Maranissestraat Area', 'Schilderswijk', 'Transvaalkwartier', 'Laakkwartier', 'Moerwijk', 'Escamp', 'Loosduinen', 'Segbroek', 'Leidschenveen-Ypenburg'],
    'Utrecht': ['Binnenstad', 'Lombok', 'Wittevrouwen', 'Tuindorp', 'Oog in Al', 'Zuilen', 'Overvecht', 'Kanaleneiland', 'Hoograven', 'Lunetten', 'Leidsche Rijn', 'Vleuten', 'De Meern', 'Terwijde', 'Parkwijk', 'Langerak', 'De Wetering', 'Rijnsweerd', 'Utrecht Science Park', 'Tolsteeg'],
    'Eindhoven': ['Centrum', 'Strijp-S', 'Woensel-Noord', 'Woensel-Zuid', 'Gestel', 'Stratum', 'Tongelre', 'Meerhoven', 'Flight Forum', 'High Tech Campus', 'Science Park Eindhoven', 'Winston Area', 'Bennekel', 'Doornakkers', 'Muschberg', 'Geestenberg', 'Lakerlopen', 'Oud-Woensel', 'Acht', 'Achtse Barrier'],
    'Tilburg': ['Centrum', 'Oud-Noord', 'Oud-Zuid', 'Noord', 'West', 'Zuid', 'Reeshof', 'Berakel', 'Korvel', 'Theresia', 'Goirke', 'Groeseind', 'Hoogvenne', 'Armhoef', 'Jeruzalem', 'Wandelbos', 'Het Zand', 'Blaak', 'Koolhoven', 'Dalem'],
    'Groningen': ['Binnenstad', 'Schildersbuurt', 'Korrewegwijk', 'Oosterparkwijk', 'Helpman', 'Beijum', 'Lewenborg', 'Vinkhuizen', 'Paddepoel', 'Selwerd', 'Hoogkerk', 'Haren', 'Ten Boer', 'Groningen-Zuid', 'Groningen-Noord', 'Groningen-West', 'Groningen-Oost', 'Europapark', 'Zernike', 'Damsterdiep'],
    'Almere': ['Stad', 'Haven', 'Buiten', 'Hout', 'Poort', 'Nobelhorst', 'Oosterwold', 'Filmwijk', 'Literatuurwijk', 'Muziekwijk', 'Stedenwijk', 'Waterwijk', 'Verzetswijk', 'Eilandenbuurt', 'Regenboogbuurt', 'Indischebuurt', 'Molenbuurt', 'Bouwmeesterbuurt', 'Stripheldenbuurt', 'Sieradenbuurt'],
    'Breda': ['Centrum', 'Ginnneken', 'Princenhage', 'Zandberg', 'Heusdenhout', 'Brabantpark', 'Hoge Vucht', 'Haagse Beemden', 'Westerpark', 'Boeimeer', 'Heuvel', 'Tuinzigt', 'Belcrum', 'Doornbos-Linie', 'Breda-Oost', 'Breda-West', 'Breda-Noord', 'Breda-Zuid', 'Ulvenhout', 'Bavel'],
    'Nijmegen': ['Centrum', 'Bottendaal', 'Altrade', 'Hunnerberg', 'Galgenveld', 'Heijendaal', 'Brakkenstein', 'Goffert', 'Hazenkamp', 'St. Anna', 'Hatert', 'Lindenholt', 'Dukenburg', 'Neerbosch-Oost', 'Heseveld', 'Waterkwartier', 'Willemskwartier', 'Nijmegen-Oost', 'Lent', 'Oosterhout'],
    'Enschede': ['Centrum', 'Lasonder-Zeggelt', 'Boddenkamp', 'Twekkelerveld', 'Bolhaar', 'Walhof-Roessingh', 'Wesselerbrink', 'Helmerhoek', 'Stroinkslanden', 'Roombeek', 'Mekkelholt', 'Deppenbroek', 'Velve-Lindenhof', 'Wooldrik', 'Hogeland', 'Boswinkel', 'Ruwenbos', 'Pathmos', 'Stadsveld', 'Glanerbrug'],
    'Apeldoorn': ['Centrum', 'De Parken', 'Indische Buurt', 'Driehuizen', 'Orden', 'Ugarderpark', 'Kerschoten', 'Zevenhuizen', 'Osseveld', 'Woudhuis', 'Maten', 'Ugchelen', 'Beekbergen', 'Hoenderloo', 'Loenen', 'Klarenbeek', 'Wenum-Wiesel', 'Beemte-Broekland', 'Hoog Soeren', 'Radio Kootwijk'],
    'Haarlem': ['Centrum', 'Vijfhoek', 'Klevenpark', 'Santpoort', 'Bloemendaal border', 'Heemstede border', 'Schalkwijk', 'Waarderpolder', 'Duinwijk', 'Ter Kleef', 'Bomenbuurt', 'Koninginnebuurt', 'Bosch en Vaart', 'Zuiderpolder', 'Parkwijk', 'Slachthuiswijk', 'Indischewijk', 'Vogelwijk', 'Ramplaankwartier', 'Houtvaartkwartier'],
    'Arnhem': ['Centrum', 'Spijkerkwartier', 'Sonsbeek-Noord', 'St. Marten', 'Klarendal', 'Velperweg', 'Molenbeke', 'Geitenkamp', 'Monnikenhuizen', 'Alteveer', 'Cranevelt', 'Burgemeesterswijk', 'Lohuizen', 'Heijenoord', 'Elderveld', 'De Laar', 'Schuytgraaf', 'Rijkerswoerd', 'Vredenburg', 'Kronenburg'],
    'Amersfoort': ['Centrum', 'Bergkwartier', 'Vermeerkwartier', 'Leusderkwartier', 'Schothorst', 'Zielhorst', 'Kattenbroek', 'Nieuwland', 'Vathorst', 'Hoogland', 'Hooglanderveen', 'Liendert', 'Rustenburg', 'Schuilenburg', 'Randenbroek', 'Soesterkwartier', 'Isselt', 'Calveen', 'Wieken', 'De Hoef'],
    'Zaanstad': ['Zaandam', 'Koog aan de Zaan', 'Zaandijk', 'Wormerveer', 'Krommenie', 'Assendelft', 'Westzaan', 'Westerspoor', 'Achtersluispolder', 'Rosariumbuurt', 'Peldersveld', 'Hoornseveld', 'Kalf', 'Oud Zaandam', 'Inverdan', 'Zuiderhout', 'Noorderhout', 'Saendelft', 'Krommeniedijk', 'Westknollendam'],
    'Haarlemmermeer': ['Hoofddorp', 'Nieuw-Vennep', 'Badhoevedorp', 'Zwanenburg', 'Halfweg', 'Lijnden', 'Rijsenhout', 'Aalsmeerderbrug', 'Rozenburg', 'Oude Meer', 'Schiphol', 'Vijfhuizen', 'Cruquius', 'Zwaanshoek', 'Beinsdorp', 'Abbenes', 'Buitenkaag', 'Lisserbroek', 'Burgerveen', 'Leimuiderbrug'],
    's-Hertogenbosch': ['Centrum', 'Uilenburg', 'De Muntel', 'Vliert', 'Paleiskwartier', 'Maaspoort', 'Empel', 'Engelen', 'Rosmalen', 'Hintham', 'Groote Wielen', 'Aawijk', 'Graafsewijk', 'Schutskamp', 'Kruiskamp', 'Helftheuvel', 'De Rompert', 'Hambaken', 'Orthen', 'Gestel'],
    'Zoetermeer': ['Centrum', 'Driemanspolder', 'Palenstein', 'Seghwaert', 'Buytenwegh', 'De Leyens', 'Meerzicht', 'Rokkeveen', 'Oosterheem', 'Noordhove', 'Zuidhove', 'Benthuizen border', 'Stompwijk border', 'Bleiswijk border', 'Lansingerland border', 'Nutricia Area', 'Business Park 27', 'Wilhelminapark', 'Westerpark', 'Balijbos Area'],
    'Zwolle': ['Binnenstad', 'Assendorp', 'Diezerpoort', 'Wipstrik', 'Berkum', 'Aa-landen', 'Holtenbroek', 'Stadshagen', 'Westenholte', 'Kamperpoort', 'Veerallee', 'Hanzeland', 'Ittersum', 'Schelle', 'Geren', 'Zwolle-Zuid', 'Windesheim', 'Wijthmen', 'Herfte', 'Frankhuis']
  },
  'Switzerland': {
    'Zurich': ['Altstadt', 'Enge', 'Seefeld', 'Wiedikon', 'Aussersihl', 'Industriequartier', 'Fluntern', 'Hottingen', 'Riesbach', 'Hirslanden', 'Unterstrass', 'Oberstrass', 'Oerlikon', 'Affoltern', 'Seebach', 'Schwamendingen', 'Witikon', 'Höngg', 'Wipkingen', 'Wollishofen'],
    'Geneva': ['Old Town', 'Pâquis', 'Plainpalais', 'Eaux-Vives', 'Champel', 'Petit-Saconnex', 'Grand-Saconnex', 'Servette', 'Saint-Jean', 'Charmilles', 'Jonction', 'Acacias', 'Carouge', 'Veyrier', 'Chêne-Bougeries', 'Cologny', 'Bellevue', 'Pregny-Chambésy', 'Meyrin', 'Vernier'],
    'Basel': ['Grosse Basel', 'Klein Basel', 'Altstadt', 'Gundeldingen', 'St. Alban', 'Bachletten', 'Gotthelf', 'Iselin', 'St. Johann', 'Matthäus', 'Rosental', 'Klybeck', 'Kleinhüningen', 'Hirzbrunnen', 'Riehen', 'Bettingen', 'Bruderholz', 'Breite', 'Am Ring', 'Vorstädte'],
    'Lausanne': ['Cité-Monrepos', 'Sous-Gare', 'Ouchy', 'Montriond', 'Cour', 'Chailly', 'Rovéréaz', 'Sallaz', 'Vennes', 'Pully', 'Prilly', 'Renens', 'Crissier', 'Ecublens', 'Epalinges', 'Le Mont-sur-Lausanne', 'Belmont-sur-Lausanne', 'Lutry', 'Morges', 'Saint-Sulpice'],
    'Bern': ['Altstadt', 'Länggasse', 'Breitenrain', 'Lorraine', 'Mattenhof', 'Weissenbühl', 'Kirchenfeld', 'Schosshalde', 'Bümpliz', 'Oberbottigen', 'Bethlehem', 'Muri', 'Köniz', 'Ostermundigen', 'Ittigen', 'Wohlén', 'Zollikofen', 'Bremgarten', 'Frauenkappelen', 'Belp'],
    'Winterthur': ['Stadt', 'Mattenbach', 'Oberwinterthur', 'Seen', 'Töss', 'Wülflingen', 'Veltheim', 'Hegi', 'Ricketwil', 'Sennhof', 'Iberg', 'Gattern', 'Eidberg', 'Dättnau', 'Niedertöss', 'Schlosstal', 'Rossberg', 'Osbühl', 'Goldenberg', 'Lindberg'],
    'Lucerne': ['Altstadt', 'Neustadt', 'Littau', 'Reussbühl', 'Tribschen', 'Langensand', 'Horw', 'Kriens', 'Ebikon', 'Adligenswil', 'Meggen', 'Emmen', 'Emmenbrücke', 'Rothenburg', 'Buchrain', 'Dierikon', 'Udligenswil', 'Vitznau', 'Weggis', 'Greppen'],
    'St. Gallen': ['Altstadt', 'St. Georgen', 'St. Fiden', 'Rotmonten', 'Lachen', 'Bruggen', 'Winkeln', 'Abtwil', 'Engelburg', 'Gossau', 'Herisau', 'Teufen', 'Speicher', 'Gais', 'Waldstatt', 'Stein', 'Hundwil', 'Schwellbrunn', 'Urnäsch', 'Rehetobel'],
    'Lugano': ['Centro', 'Loreto', 'Molino Nuovo', 'Cassarate', 'Castagnola', 'Brè', 'Aldesago', 'Gandria', 'Pregassona', 'Viganello', 'Cureggia', 'Pambio-Noranco', 'Pazzallo', 'Barbengo', 'Carabbia', 'Carona', 'Sonvico', 'Valcolla', 'Breganzona', 'Paradiso'],
    'Biel/Bienne': ['Altstadt', 'Neustadt', 'Madretsch', 'Mett', 'Bözingen', 'Vingelz', 'Nidau', 'Ipsach', 'Port', 'Brügg', 'Orpund', 'Safnern', 'Meinisberg', 'Pieterlen', 'Lengnau', 'Evilard', 'Magglingen', 'Twann', 'Ligerz', 'Tüscherz'],
    'Thun': ['Altstadt', 'Hofstetten', 'Gwatt', 'Allmendingen', 'Schoren', 'Dürrenast', 'Lerchenfeld', 'Goldiwil', 'Hilterfingen', 'Oberhofen', 'Hünibach', 'Steffisburg', 'Heimberg', 'Uetendorf', 'Wattenwil', 'Seftigen', 'Belp', 'Spiez', 'Wimmis', 'Interlaken'],
    'Koniz': ['Wabern', 'Liebefeld', 'Spiegel', 'Schliern', 'Niederscherli', 'Gasel', 'Oberscherli', 'Mittelhäusern', 'Niedermuhlern', 'Oberbalm', 'Mengestorf', 'Landorf', 'Gurtendorf', 'Herzwil', 'Liebewil', 'Buhl', 'Ried', 'Niederwangen', 'Oberwangen', 'Thörishaus'],
    'La Chaux-de-Fonds': ['Centre', 'Les Eplatures', 'Le Crêt-du-Locle', 'Les Arêtes', 'Les Foulets', 'Les Forges', 'Bellevue', 'L\'Eplattenier', 'Pouillerel', 'Cernier', 'Dombresson', 'Villiers', 'Enges', 'Savagnier', 'Fenin', 'Vilars', 'Saules', 'Valangin', 'Boudevilliers', 'Fontaines'],
    'Fribourg': ['Bourg', 'Neuveville', 'Auge', 'Places', 'Alt', 'Gambach', 'Beauregard', 'Vignettaz', 'Schoenberg', 'Pérolles', 'Beaumont', 'Jura', 'Torretta', 'Guintzet', 'Villars-sur-Glâne', 'Marly', 'Givisiez', 'Granges-Paccot', 'Corminboeuf', 'Avry'],
    'Schaffhausen': ['Altstadt', 'Breite', 'Herblingen', 'Niklausen', 'Buchthalen', 'Emmersberg', 'Neuhausen am Rheinfall', 'Flurlingen', 'Feuerthalen', 'Laufen-Uhwiesen', 'Dachsen', 'Beringen', 'Thayngen', 'Stein am Rhein', 'Ramsen', 'Hemishofen', 'Buch', 'Gottmadingen border', 'Thayngen industrial', 'Klettgau'],
    'Chur': ['Altstadt', 'Lachen', 'Araschgen', 'Sassal', 'Haldenstein border', 'Felsberg border', 'Trimmis border', 'Maladers border', 'Passugg border', 'Masans', 'Fürstenwald', 'Gansahla', 'Sand', 'Meiersboden', 'Plankis', 'Rossboden', 'Sommerau', 'Welschdörfli', 'Rosenhügel', 'Kaserne'],
    'Vernier': ['Vernier-Village', 'Châtelaine', 'Aïre', 'Le Lignon', 'Les Avanchets', 'Cointrin', 'Meyrin border', 'Satigny border', 'Bernex border', 'Onex border', 'Grand-Saconnex border', 'Geneva border', 'Rhône Bank', 'Industrial Zone', 'Airport Zone', 'International Zone', 'CERN Area', 'Meyrin Village', 'Satigny Village', 'Zimeysa'],
    'Neuchatel': ['Centre', 'Peseux', 'Corcelles', 'Cormondrèche', 'Valangin', 'Marin-Epagnier', 'Saint-Blaise', 'Hauterive', 'La Tène', 'Boudry', 'Cortaillod', 'Milvignes', 'Rochefort', 'Bevaix', 'Saint-Aubin-Sauges', 'Gorgier', 'Vaumarcus', 'Provence', 'Le Landeron', 'Cressier'],
    'Sion': ['Centre', 'Planta', 'Condémines', 'Vissigen', 'Champsec', 'Aéroport', 'Bramois', 'Savièse border', 'Grimisuat border', 'Ayent border', 'Nendaz border', 'Veysonnaz border', 'Salins', 'Les Agettes', 'Arbaz', 'Vétroz', 'Conthey', 'Saint-Léonard', 'Uvrier', 'Mornaz'],
    'Uster': ['Stadt', 'Kirchuster', 'Niederuster', 'Nänikon', 'Werrikon', 'Winikon-Guntenbach', 'Wermatswil', 'Riedikon', 'Sulzbach', 'Freudwil', 'Mönchaltorf border', 'Egg border', 'Greifensee border', 'Volketswil border', 'Dübendorf border', 'Pfäffikon border', 'Wetzikon border', 'Gossau border', 'Hinwil border', 'Maur border']
  },
  'Qatar': {
    'Doha': ['West Bay', 'The Pearl', 'Msheireb', 'Lusail', 'Al Sadd', 'Dafna', 'Bin Mahmoud', 'Abu Hamour', 'Al Waab', 'Al Rayyan', 'Madinat Khalifa', 'Al Gharafa', 'Duhail', 'Al Khor', 'Al Wakrah', 'Old Airport', 'Najma', 'Mansoura', 'Umm Ghuwailina', 'Muntazah'],
    'Al Rayyan': ['Aspire Zone', 'Villaggio Area', 'Al Aziziyah', 'Muraikh', 'Muaither', 'Al Wajbah', 'Al Shagub', 'Education City', 'Gharrafat Al Rayyan', 'Bani Hajer', 'Al Sailiya', 'Abu Hamour South', 'Ain Khaled', 'Industrial Area South', 'Rawdat Al Jahaniya', 'Mebaireek', 'Al Karaana', 'Al Sheehaniya', 'Umm Bab', 'Dukhan'],
    'Al Wakrah': ['Al Wakrah Port', 'Ezdan Village', 'Al Wukair', 'Al Mashaf', 'Barwa City', 'Religious Complex Area', 'Al Sealine', 'Mesaieed Industrial', 'Mesaieed Residential', 'Al Janoub Stadium Area', 'Al Wakrah Souq', 'Family Beach Area', 'Al Jabel', 'Jabal Al Wukair', 'Birkat Al Awamer', 'Logistics Park South', 'Abu Fontas', 'Hamad Port Area', 'Umm Al Houl', 'Khor Al Adaid'],
    'Al Khor': ['Al Thakhira', 'Al Farkiah Beach', 'Al Khor Island', 'Corniche', 'Industrial Area', 'Al Khor Community', 'Al Qarma', 'Al Egda', 'Al Heedan', 'Al Jeryan', 'Umm Birkah', 'Al Ghuwariyah', 'Fuwairit border', 'Madinat ash Shamal border', 'Ras Laffan Industrial', 'Ras Laffan Residential', 'Al Khawr West', 'Simaisma', 'Al Jassasiya', 'Al Ruwais'],
    'Lusail': ['Marina District', 'Fox Hills', 'Energy City', 'Entertainment City', 'Lusail Stadium Area', 'Al Erkyah', 'Qetaifan Islands', 'Waterfront Residential', 'Golf District', 'Medical District', 'Education District', 'Commercial District', 'Lusail Plaza', 'Boulevard Area', 'Winter Wonderland Area', 'Yasmeen City', 'Al Wessil', 'Naifa', 'Seef Lusail', 'Lusail North'],
    'Mesaieed': ['Industrial Area', 'QP Residential', 'Port Area', 'MIC Offices', 'Mesaieed Souq', 'Sand Dunes Area', 'Al Afjah', 'Beach Club Area', 'Gas Plant Area', 'Steel Plant Area', 'Fertilizer Plant Area', 'Aluminum Plant Area', 'Refinery Area', 'Chemical Plant Area', 'Terminal Area', 'Holding Area', 'Export Zone', 'Jetty Area', 'Customs Area', 'Security Zone'],
    'Al Sheehaniya': ['Camel Race Track', 'Zekreet', 'Dukhan City', 'Al Utouriya', 'Al Jemailiya', 'Umm Bab Industrial', 'Al Ghuwariyah West', 'Rawdat Rashed', 'Umm Al Afai', 'Al Nasriyah', 'Al Shahaniya North', 'Al Shahaniya South', 'Leabaib', 'Umm Al Zubar', 'Makinys', 'Al Kharsaah', 'Al Sanah', 'Al Owaina', 'Al Samriya', 'Zekreet Film City Area'],
    'Al Shamal': ['Madinat ash Shamal', 'Ar Ruwais', 'Abu Dhalouf', 'Al Zubarah Heritage', 'Ain Mohammed', 'Al Arish', 'Al Khuwayr', 'Al Qa\'iyah', 'Ras Qartas', 'Al Ghariyah', 'Fuwairit', 'Athba', 'Umm Jassim', 'Al Mafjar', 'Ras Al Matbakh', 'Al Jasasiya', 'Lisha', 'Muraikh', 'Al Rakiyat', 'Thaqab'],
    'Al Daayen': ['Simaisma', 'Leabaib', 'Al Ebb', 'Jeryan Jenaihat', 'Rawdat Al Hamama', 'Wadi Al Banat', 'Wadi Al البنات', 'Al Kheesa', 'Al Egla', 'Al Masrouhiya', 'Wadi Lusail', 'Al Sakhama', 'Umm Qarn', 'Al Jeryan', 'Umm Al Amad', 'Umm Ebairiya', 'Jeryan Nejaima', 'Izghawa North', 'Al Froosh', 'Al Kharaitiyat North'],
    'Umm Salal': ['Umm Salal Mohammed', 'Umm Salal Ali', 'Al Kheesa West', 'Al Kharaitiyat', 'Izghawa', 'Barzan Towers Area', 'Al Sakhama South', 'Bu Fasseela', 'Umm Ebairiya', 'Umm Al Amad', 'Al Mazrouah', 'Al Egda North', 'Rawdat Al Hamama West', 'Al Jeryan South', 'Al Foroush', 'Sani Al-Hamidi', 'Umm Al Kilab', 'Wadi Al-Askar', 'Wadi Al-Wajbah', 'Jeryan Al-Sane'],
    'Simaisma': ['Beach Area', 'Al Khor Road Area', 'Simaisma North', 'Simaisma South', 'Simaisma Central', 'Resort Area', 'Market Area', 'Park Area', 'School Zone', 'Mosque Area', 'Farm Area', 'Industrial Strip', 'Old Simaisma', 'New Simaisma', 'Coastal Road', 'Inland Area', 'Boundary North', 'Boundary South', 'Utility Zone', 'Police Station Area'],
    'Dukhan': ['QP Housing', 'Dukhan Beach', 'Industrial Zone', 'Plant Area', 'Club Area', 'English School Area', 'Dukhan Souq', 'Medical Clinic Area', 'Fire Station Area', 'Police Station Area', 'Jebel Dukhan', 'Zekreet Road', 'Umm Bab Road', 'Coast Guard Area', 'Port Area', 'Storage Area', 'Maintenance Zone', 'Utility Zone', 'Administrative Area', 'Dukhan North'],
    'Al Thakhira': ['Mangroves Area', 'Al Thakhira Beach', 'Housing Complex', 'Industrial Area', 'Port Area', 'Corniche', 'Al Khor Community border', 'Al Qarma border', 'North Sector', 'South Sector', 'East Sector', 'West Sector', 'Market Area', 'Clinic Area', 'School Area', 'Park Area', 'Heritage Site', 'Eco Tourism Area', 'Island View', 'Harbor Area'],
    'Al Ghuwariyah': ['City Center', 'Old Ghuwariyah', 'New Ghuwariyah', 'Agricultural Zone', 'Farm 1', 'Farm 2', 'Farm 3', 'Farm 4', 'Farm 5', 'Farm 6', 'Farm 7', 'Farm 8', 'Farm 9', 'Farm 10', 'Farm 11', 'Farm 12', 'Farm 13', 'Farm 14', 'Farm 15', 'Farm 16'],
    'Msheireb': ['Downtown', 'Heart of Doha', 'Al Kahraba Street', 'Barahat Msheireb', 'Sikkat Al Wadi', 'Heritage Quarter', 'Residential Quarter', 'Commercial Quarter', 'Mixed-use Quarter', 'Retail Quarter', 'Souq Waqif border', 'Museums Area', 'Grand Mosque Area', 'Metro Station Area', 'Doha Oasis border', 'Al Diwan border', 'Amiri Diwan Area', 'Jasper Area', 'Topaz Area', 'Onyx Area'],
    'Al Sadd': ['Sadd Plaza', 'Royal Plaza Area', 'Lulu Area', 'Mirqab Mall Area', 'Joaan', 'Al Nasr', 'Al Mirqab', 'Suhaim Bin Hamad', 'C-Ring Road', 'D-Ring Road', 'Hamad Hospital Area', 'Medical City', 'Jawaan Metro', 'Al Sadd Metro', 'Millennium Hotel Area', 'Wyndham Area', 'Al Mana Tower Area', 'Sadd 1', 'Sadd 2', 'Sadd 3'],
    'Al Wajbah': ['Palace Area', 'Al Wajbah Fort Area', 'Residential North', 'Residential South', 'Al Rayyan border', 'Bani Hajer border', 'Education City border', 'Dukhan Road Area', 'Wajbah West', 'Wajbah East', 'Wajbah Central', 'Royal Stables', 'Farm Area', 'Security Zone', 'VIP Housing', 'Staff Housing', 'Utility Zone', 'Green Zone', 'Desert Edge', 'Boundary West'],
    'Bani Hajer': ['Residential North', 'Residential South', 'Commercial Strip', 'Al Rayyan border', 'Al Wajbah border', 'Gharrafa border', 'Izghawa border', 'Celebration Road Area', 'Community Park Area', 'School Zone', 'Health Center Area', 'Mosque Area', 'Villa Compound 1', 'Villa Compound 2', 'Villa Compound 3', 'Villa Compound 4', 'Villa Compound 5', 'Villa Compound 6', 'Utility Zone', 'Future Dev'],
    'Ain Khaled': ['Residential North', 'Residential South', 'Salwa Road Area', 'Industrial Area border', 'Abu Hamour border', 'Al Waab border', '01 Mall Area', 'Doha British School Area', 'Leader International Area', 'Villa Compound A', 'Villa Compound B', 'Villa Compound C', 'Commercial Strip', 'Utility Zone', 'Park Area', 'Mosque Area', 'Clinic Area', 'Service Road', 'Back Road', 'Boundary South'],
    'Abu Hamour': ['Wholesale Market Area', 'Petrol Station Area', 'Safari Mall Area', 'Dar Al Salam Area', 'Religious Complex Area', 'Medical City border', 'Salwa Road border', 'Mesaimeer border', 'Ain Khaled border', 'Al Maamoura border', 'Nuaija border', 'E-Ring Road', 'F-Ring Road', 'Rawdat Al Khail', 'Haloul St', 'Umm Al Seneem', 'Al Thumama border', 'Industrial Area border', 'Airport Road border', 'D-Ring Road border']
  },
  'Turkey': {
    'Istanbul': ['Levent', 'Maslak', 'Besiktas', 'Beyoglu', 'Sariyer', 'Sisli', 'Kadikoy', 'Uskudar', 'Atasehir', 'Umraniye', 'Bakirkoy', 'Bahcelievler', 'Basaksehir', 'Beylikduzu', 'Esenyurt', 'Fatih', 'Zeytinburnu', 'Eyup', 'Kagithane', 'Maltepe'],
    'Ankara': ['Cankaya', 'Kizilay', 'Ulus', 'Bahcelievler', 'Yenimahalle', 'Kecioren', 'Etimesgut', 'Sincan', 'Mamak', 'Altindag', 'Golbasi', 'Pursaklar', 'Cayyolu', 'Umitkoy', 'Bilkent', 'Odtu', 'Beysukent', 'Incek', 'Batikent', 'Demeteveler'],
    'Izmir': ['Alsancak', 'Karsiyaka', 'Bornova', 'Konak', 'Buca', 'Gaziemir', 'Cigli', 'Balcova', 'Narlidere', 'Guzelbahce', 'Urla', 'Cesme', 'Alacati', 'Foca', 'Dikili', 'Ayvalik border', 'Menderes', 'Torbali', 'Aliaga', 'Kemalpasa'],
    'Bursa': ['Osmangazi', 'Nilufer', 'Yildirim', 'Mudanya', 'Gemlik', 'Gursu', 'Kestel', 'Inegyol', 'Karacabey', 'Mustafakemalpasa', 'Orhangazi', 'Iznik', 'Yenisehir', 'Harmancik', 'Keles', 'Orhaneli', 'Buyukorhan', 'Uludag Area', 'Cekirge', 'Heykel'],
    'Antalya': ['Muratpasa', 'Kepez', 'Konyaalti', 'Lara', 'Kundu', 'Belek', 'Side', 'Alanya', 'Manavgat', 'Kemer', 'Kas', 'Kalkan', 'Finike', 'Demre', 'Gazipasa', 'Korkuteli', 'Elmali', 'Akseki', 'Ibradi', 'Gundogmus'],
    'Adana': ['Seyhan', 'Cukurova', 'Saricam', 'Yuregir', 'Karaisali', 'Ceyhan', 'Kozan', 'Imamoglu', 'Pozanti', 'Karaisali', 'Aladag', 'Feke', 'Saimbeyli', 'Tufanbeyli', 'Yumurtalik', 'Karatas', 'Ziyapasa', 'Gazipasa', 'Turgut Ozal', 'Kenan Evren'],
    'Konya': ['Selcuklu', 'Meram', 'Karatay', 'Eregli', 'Aksehir', 'Beysehir', 'Seydisehir', 'Cumra', 'Ilgin', 'Cihanbeyli', 'Kulu', 'Kadinhani', 'Sarayonu', 'Bozkir', 'Yunak', 'Doganhisar', 'Huyuk', 'Altinekin', 'Hadim', 'Taskent'],
    'Gaziantep': ['Sahinbey', 'Sehitkamil', 'Oguzeli', 'Nizip', 'Islahiye', 'Nurdagi', 'Araban', 'Yavuzeli', 'Karkamis', 'Gazi Muhtar Pasa', 'Sankopark Area', 'Primemall Area', 'Organize Sanayi', 'Kusget', 'Karatas', 'Ibrahimli', 'Gazikent', 'Emek', 'Degirmicem', 'Sarihulluk'],
    'Kayseri': ['Melikgazi', 'Kocasinan', 'Talas', 'Hacilar', 'Incesu', 'Develi', 'Yahyali', 'Bunyan', 'Pinarbasi', 'Tomarza', 'Yeşilhisar', 'Sarioglan', 'Sariz', 'Felahiye', 'Ozvatan', 'Erciyes Area', 'Organize Sanayi', 'Mimarsinan', 'Ildem', 'Belsin'],
    'Mersin': ['Yenisehir', 'Mezitli', 'Akdeniz', 'Toroslar', 'Tarsus', 'Erdemli', 'Silifke', 'Anamur', 'Mut', 'Bozyazi', 'Gulnar', 'Aydincik', 'Camliyayla', 'Pozcu', 'Viransehir', 'Adnan Menderes', 'Kushimato', 'Carsi', 'Liman', 'Tece'],
    'Eskisehir': ['Odunpazari', 'Tepebasi', 'Carsi', 'Baglar', 'Visnelik', 'Akarbasi', 'Sumer', 'Osmangazi', 'Batikkent', 'Sazova', 'Cifteler', 'Mahmudiye', 'Sivrihisar', 'Alpu', 'Mihalgazi', 'Saricakaya', 'Mihaliccik', 'Gunyuzu', 'Han', 'Seyitgazi'],
    'Diyarbakir': ['Kayapinar', 'Baglar', 'Yenisehir', 'Sur', 'Ergani', 'Bismil', 'Silvan', 'Cermik', 'Cinar', 'Dicle', 'Kulp', 'Hani', 'Lice', 'Egil', 'Hazro', 'Kocakoy', 'Cungus', 'Dagkapi', 'Ofis', 'Diclekent'],
    'Samsun': ['Atakum', 'Canik', 'Ilkadim', 'Tekkekoy', 'Bafra', 'Carsamba', 'Vezirkopru', 'Terme', 'Havza', 'Alacam', '19 Mayis', 'Asarcik', 'Ayvacik', 'Kavak', 'Ladık', 'Salipazari', 'Yakakent', 'Ciftlik', 'Mecidiye', 'Saathane'],
    'Denizli': ['Pamukkale', 'Merkezefendi', 'Acipayam', 'Tavas', 'Honaz', 'Saraykoy', 'Buldan', 'Kale', 'Civril', 'Guney', 'Bozkurt', 'Serinhisar', 'Cardak', 'Bekilli', 'Babadag', 'Cal', 'Cameli', 'Baklan', 'Beyagac', 'Cinar'],
    'Sanliurfa': ['Haliliye', 'Eyyubiye', 'Karakopru', 'Siverek', 'Viransehir', 'Suruc', 'Birecik', 'Akcakale', 'Ceylanpinar', 'Harran', 'Bozova', 'Hilvan', 'Halfeti', 'Balikligol Area', 'Dergh', 'Bahcelievler', 'Yenisehir', 'Esentepe', 'Sultan Fatih', 'Baglarbasi'],
    'Adapazari': ['Serdivan', 'Erenler', 'Arifiye', 'Sapanca', 'Akyazi', 'Hendek', 'Karasu', 'Geyve', 'Kocaali', 'Pamukova', 'Ferizli', 'Kaynarca', 'Sogutlu', 'Karapurcek', 'Tarakli', 'Carsi', 'Mithatpasa', 'Yenigun', 'Maltepe', 'Hizirtepe'],
    'Malatya': ['Battalgazi', 'Yesilyurt', 'Dogansehir', 'Akcadag', 'Darende', 'Hekimhan', 'Puturge', 'Yazihan', 'Arapgir', 'Kuluncak', 'Arguvan', 'Kale', 'Doganyol', 'Carsi', 'Kanalboyu', 'Fahri Kayahan', 'Tecde', 'Bostanbasi', 'Pasa Kosku', 'Karakavak'],
    'Kahramanmaras': ['Onikisubat', 'Dulkadiroglu', 'Elbistan', 'Afsin', 'Turkoglu', 'Pazarcik', 'Goksun', 'Andirin', 'Caglayancerit', 'Nurhak', 'Ekinozu', 'Carsi', 'Azerbaycan Bulvari', 'Trabzon Caddesi', 'Yatili Bolge', 'Binekli', 'Haydar Bey', 'Tekerek', 'Bogazici', 'Vadi'],
    'Erzurum': ['Yakutiye', 'Palandoken', 'Aziziye', 'Horasan', 'Oltu', 'Pasinler', 'Karayazi', 'Hinis', 'Tekman', 'Karaçoban', 'Askale', 'Senkaya', 'Cat', 'Köprüköy', 'Tortum', 'Narman', 'Uzundere', 'Olur', 'Palandoken Kayak', 'Cumhuriyet Caddesi'],
    'Trabzon': ['Ortahisar', 'Akcaabat', 'Araklı', 'Of', 'Yomra', 'Arsin', 'Vakfıkebir', 'Sürmene', 'Maçka', 'Beşikdüzü', 'Çarşıbaşı', 'Tonya', 'Düzköy', 'Şalpazarı', 'Çaykara', 'Hayrat', 'Dernekpazarı', 'Köprübaşı', 'Meydan Area', 'Ganita Area']
  },
  'Egypt': {
    'Cairo': ['Maadi', 'Zamalek', 'Garden City', 'Heliopolis', 'Nasr City', 'New Cairo', '5th Settlement', '6th of October', 'Sheikh Zayed', 'Mohandessin', 'Dokki', 'Downtown', 'Shubra', 'Abbasiya', 'Abdeen', 'Mounira', 'Sayeda Zeinab', 'Haram', 'Faisal', 'Imbaba'],
    'Alexandria': ['Sidi Gaber', 'Smouha', 'Stanley', 'Glym', 'Roushdy', 'Kafr Abdo', 'San Stefano', 'Mandara', 'Montaza', 'Maamoura', 'Miami', 'Sidi Bishr', 'Asafra', 'Victoria', 'Sporting', 'Ibrahimia', 'Camp Caesar', 'Chatby', 'Azarita', 'Manshia'],
    'Giza': ['Haram', 'Faisal', 'Dokki', 'Mohandessin', 'Agouza', 'Kit Kat', 'Imbaba', 'Warraq', 'Munira', 'Saft El Laban', 'Boulaq El Dakrour', 'Omraneya', 'Sakiat Mekky', 'Pyramids Area', 'Smart Village', '6th of October', 'Sheikh Zayed', 'Hadaeq El Ahram', 'Dreamland', 'Beverly Hills Area'],
    'Shubra El-Kheima': ['Bahtim', 'Mostorod', 'El Omraneya', 'El Sharqiya', 'El Gharbiya', 'Bigam', 'Manshia', 'Sawaq', 'Delta Area', 'Corniche', 'Ring Road Area', 'Metro Area', 'Industrial Area', 'Market Area', 'Khalifa Area', 'Nadi Area', 'Othman Area', 'Mahmoudia Area', 'Safa Area', 'Marwa Area'],
    'Port Said': ['Port Fouad', 'Sharq District', 'Manakh District', 'Arab District', 'Zohour District', 'Dawahy District', 'Ganoub District', 'Free Zone', 'Corniche', 'Beach Area', 'Tarh El Bahr', 'Three Towers Area', 'Palestine St Area', 'Gomhouria St Area', 'Suez Canal St Area', 'Industrial Area', 'Customs Area', 'Harbor Area', 'Airport Area', 'Sport Area'],
    'Suez': ['Suez City', 'Arbaeen', 'Ganayen', 'Faisal', 'Attaka', 'Port Tewfik', 'Suez Port', 'Sokhna Port', 'Ain Sokhna Residential', 'Suez Canal Area', 'Adabiya', 'Industrial Area', 'Petroleum Area', 'Fertilizer Area', 'Steel Area', 'Power Plant Area', 'Beach Area', 'Corniche', 'Downtown', 'Service Area'],
    'Luxor': ['East Bank', 'West Bank', 'Luxor Temple Area', 'Karnak Temple Area', 'Valley of the Kings Area', 'Valley of the Queens Area', 'Corniche', 'Television St', 'Salah El-Din St', 'Karnak St', 'Airport Area', 'Railway Area', 'Old Souq', 'Hotel District', 'Ferry Area', 'Banana Island Area', 'Medinet Habu Area', 'Deir el-Bahari Area', 'Ramesseum Area', 'Nobles Tombs Area'],
    'Mansoura': ['Talkha', 'University Area', 'Gomhouria St', 'Mashaya Area', 'Thawra St', 'Suez Canal St', 'Abdel Salam Aref St', 'Port Said St', 'Galaa St', 'Mishal Area', 'Toriel Area', 'Saba Area', 'Sindi Area', 'Nadi Area', 'Market Area', 'Industrial Area', 'Railway Area', 'Hospital Area', 'Administrative Area', 'East Mansoura'],
    'El Mahalla El Kubra': ['Industrial Area', 'Textile Factory Area', 'Gomhouria St', 'Bahr St', 'Sadd Area', 'Shubra Area', 'Ziraa Area', 'Market Area', 'Railway Area', 'Hospital Area', 'Club Area', 'School Zone', 'Police Station Area', 'Administrative Area', 'North Mahalla', 'South Mahalla', 'East Mahalla', 'West Mahalla', 'Samanoud border', 'Tanta border'],
    'Tanta': ['City Center', 'Saeed St', 'Galaa St', 'Moheb St', 'Helw St', 'Hassan Radwan St', 'Mahmoudia Area', 'Seberbay Area', 'University Area', 'Railway Area', 'Sayed El-Badawi Area', 'Market Area', 'Industrial Area', 'Administrative Area', 'North Tanta', 'South Tanta', 'East Tanta', 'West Tanta', 'Mahalla border', 'Kafr El-Zayat border'],
    'Asyut': ['University Area', 'Gomhouria St', 'Corniche', 'Nile View Area', 'Ferial Area', 'Hamra Area', 'Ziraa Area', 'Industrial Area', 'Railway Area', 'Airport Area', 'Old Asyut', 'New Asyut', 'Assiut Barrage Area', 'Dronka Area', 'Manfalut border', 'Abu Tig border', 'El Qusiya border', 'Dayrut border', 'Abnub border', 'El Badari border'],
    'Ismailia': ['Suez Canal Area', 'Lake Timsah Area', 'Sheikh Zayed', 'Galaa St', 'Thawra St', 'Sultan Hussein St', 'Garden City', 'Industrial Area', 'University Area', 'Port Area', 'Ferry Area', 'Beach Area', 'Club Area', 'Administrative Area', 'North Ismailia', 'South Ismailia', 'East Ismailia', 'West Ismailia', 'Suez border', 'Port Said border'],
    'Fayyum': ['City Center', 'University Area', 'Lake Qarun Area', 'Wadi El-Rayan Area', 'Itfih Area', 'Lahoun Area', 'Hawara Area', 'Industrial Area', 'Market Area', 'Railway Area', 'Administrative Area', 'North Fayyum', 'South Fayyum', 'East Fayyum', 'West Fayyum', 'Itsa border', 'Sinnuris border', 'Tamiya border', 'Ibshaway border', 'Youssef El Seddik border'],
    'Zagazig': ['University Area', 'City Center', 'Galaa St', 'Port Said St', 'Suez Canal St', 'Moheb St', 'Industrial Area', 'Market Area', 'Railway Area', 'Administrative Area', 'North Zagazig', 'South Zagazig', 'East Zagazig', 'West Zagazig', 'Minya El Qamh border', 'Abu Hammad border', 'Bilbeis border', 'Diyarb Negm border', 'Ibrahimiya border', 'Hehia border'],
    'Aswan': ['Corniche', 'Elephantine Island Area', 'Philae Temple Area', 'High Dam Area', 'Unfinished Obelisk Area', 'Nubian Village Area', 'Market Area', 'Railway Area', 'Airport Area', 'Hotel District', 'Ferry Area', 'Industrial Area', 'Administrative Area', 'North Aswan', 'South Aswan', 'East Aswan', 'West Aswan', 'Kom Ombo border', 'Edfu border', 'Abu Simbel border'],
    'Damietta': ['Ras El Bar', 'New Damietta', 'Damietta Port', 'Industrial City', 'Furniture Market Area', 'Corniche', 'Bahr St', 'Galaa St', 'Market Area', 'Harbor Area', 'Beach Area', 'Administrative Area', 'North Damietta', 'South Damietta', 'East Damietta', 'West Damietta', 'Faraskur border', 'Zarqa border', 'Kafr Saad border', 'Kafr El-Battikh border'],
    'Damanhur': ['City Center', 'University Area', 'Gomhouria St', 'Corniche', 'Market Area', 'Industrial Area', 'Railway Area', 'Administrative Area', 'North Damanhur', 'South Damanhur', 'East Damanhur', 'West Damanhur', 'Kafr El-Dawar border', 'Abu Hummus border', 'Itay El-Barud border', 'Shubrakhit border', 'Rahmaniya border', 'Delengat border', 'Hosh Issa border', 'Kom Hamada border'],
    'Minya': ['University Area', 'Corniche', 'Gomhouria St', 'Thawra St', 'Suez Canal St', 'Industrial Area', 'Market Area', 'Railway Area', 'Administrative Area', 'North Minya', 'South Minya', 'East Minya', 'West Minya', 'Maghagha border', 'Beni Mazar border', 'Matay border', 'Samalut border', 'Abu Qurqas border', 'Mallawi border', 'Deir Mawas border'],
    'Beni Suef': ['University Area', 'Corniche', 'Gomhouria St', 'Industrial Area', 'Market Area', 'Railway Area', 'Administrative Area', 'North Beni Suef', 'South Beni Suef', 'East Beni Suef', 'West Beni Suef', 'Wasta border', 'Nasser border', 'Beba border', 'Sumusta border', 'Ihnasia border', 'Al-Fashn border', 'New Beni Suef', 'Beni Suef Port', 'Cement Factory Area'],
    'Qena': ['City Center', 'University Area', 'Corniche', 'Dendera Temple Area', 'Industrial Area', 'Market Area', 'Railway Area', 'Administrative Area', 'North Qena', 'South Qena', 'East Qena', 'West Qena', 'Luxor border', 'Nag Hammadi border', 'Deshna border', 'Qus border', 'Farshut border', 'Abu Tisht border', 'Waqf border', 'Naqada border']
  },
  'South Africa': {
    'Johannesburg': ['Sandton', 'Rosebank', 'Randburg', 'Fourways', 'Midrand', 'Bedfordview', 'Edenvale', 'Parkhurst', 'Melville', 'Braamfontein', 'Newtown', 'Soweto', 'Bryanston', 'Rivonia', 'Sunninghill', 'Woodmead', 'Houghton', 'Saxonwold', 'Kensington', 'Northcliff', 'Parktown'],
    'Cape Town': ['CBD', 'Waterfront', 'Seapoint', 'Greenpoint', 'Camps Bay', 'Clifton', 'Constantia', 'Newlands', 'Rondebosch', 'Woodstock', 'Observatory', 'Century City', 'Blouberg', 'Milnerton', 'Durbanville', 'Bellville', 'Hout Bay', 'Muizenberg', 'Kalk Bay', 'Simonstown'],
    'Durban': ['CBD', 'Umhlanga', 'Berea', 'Glenwood', 'Morningside', 'Musgrave', 'Durban North', 'La Lucia', 'Ballito', 'Amanzimtoti', 'Westville', 'Pinetown', 'Hillcrest', 'Kloof', 'Yellowwood Park', 'Bluff', 'Chatsworth', 'Phoenix', 'Inanda', 'Umlazi'],
    'Pretoria': ['CBD', 'Hatfield', 'Brooklyn', 'Waterkloof', 'Menlyn', 'Faerie Glen', 'Silver Lakes', 'Arcadia', 'Sunnyside', 'Garsfontein', 'Moreleta Park', 'Centurion', 'Midstream', 'Irene', 'Lyttelton', 'Zwartkop', 'Wierda Park', 'Rooihuiskraal', 'Eldoraigne', 'Monavoni'],
    'Port Elizabeth': ['Summerstrand', 'Humewood', 'Walmer', 'Mill Park', 'Mount Croix', 'Central', 'Richmond Hill', 'Newton Park', 'Lorraine', 'Cotswold', 'Bluewater Bay', 'Colchester', 'Uitenhage', 'Despatch', 'Motherwell', 'Kwazakhele', 'Zwide', 'New Brighton', 'Greenbushes', 'Seaview'],
    'Bloemfontein': ['Westdene', 'Brandwag', 'Dan Pienaar', 'Heurred', 'Langenhoven Park', 'Universitas', 'Fichardt Park', 'Pellissier', 'Bayswater', 'Wild Olive Estate', 'Navalsig', 'Hilton', 'Ehrlich Park', 'Heidedal', 'Mangaung', 'Rocklands', 'Phelindaba', 'Bloemanda', 'Freedom Square', 'Botshabelo'],
    'East London': ['CBD', 'Beacon Bay', 'Nahoon', 'Selborne', 'Vincent', 'Bereah', 'Bunkers Hill', 'Stirling', 'Dorchester Heights', 'Gonubie', 'Cove Rock', 'Sunnyridge', 'Greenfields', 'West Bank', 'Amalinda', 'Cambridge', 'Bonnie Doon', 'Quigney', 'Abbotsford', 'Cove Woods'],
    'Pietermaritzburg': ['CBD', 'Hayfields', 'Scottsville', 'Pelham', 'Chase Valley', 'Montrose', 'Oak Park', 'Wembley', 'Clarendon', 'Prestbury', 'Blackridge', 'Lincoln Meade', 'Sobantu', 'Northdale', 'Raisethorpe', 'Allandale', 'Edendale', 'Imbali', 'Ashburton', 'Hilton AU'],
    'Soweto': ['Diepkloof', 'Orlando East', 'Orlando West', 'Pimville', 'Meadowlands', 'Dobsonville', 'Zola', 'Emndeni', 'Jabulani', 'Naledi', 'Protea Glen', 'Protea North', 'Chiawelo', 'Senaoane', 'Dhlamini', 'Moroka', 'Jabavu', 'Molapo', 'Moletsane', 'Mapetla'],
    'Benoni': ['CBD', 'Northmead', 'Rynfield', 'Lakefield', 'Farrarmere', 'Western Extension', 'Actonville', 'Wattville', 'Daveyton', 'Etwatwa', 'Crystal Park', 'Cloverdene', 'Putfontein', 'Petit', 'Benoni AH', 'Brentwood Park', 'Fairleads', 'Ebotse', 'Morehill', 'Dewald Hattingh'],
    'Tembisa': ['Hospital View', 'Winnie Mandela', 'Khatlampong', 'Oakmoor', 'Kempton Park border', 'Clayville border', 'Olifantsfontein border', 'Midstream border', 'Phomolong', 'Chloorkop', 'Lekaneng', 'Isithama', 'Esangweni', 'Ibaxa', 'Umfuyaneng', 'Emoyeni', 'Tsenelong', 'Kopanong', 'Igqagqa', 'Ethafeni'],
    'Vereeniging': ['CBD', 'Three Rivers', 'Peacehaven', 'Falcon Ridge', 'Sonland Park', 'Arcon Park', 'Roshnee', 'Dadaville', 'Duncanville', 'Unitas Park', 'Sharpeville', 'Sebokeng', 'Evaton', 'Vanderbijlpark border', 'Meyerton border', 'Heidelberg border', 'Walkerville border', 'Vaaldam Area', 'Bedworth Park', 'Steelhaven'],
    'Newcastle SA': ['CBD', 'Madadeni', 'Osizweni', 'Aviary Hill', 'Pioneer Park', 'Signal Hill', 'Schuinshoogte', 'Paradise', 'Lennoxton', 'Fairleigh', 'Ncandu Park', 'Amiel Park', 'Sunnyridge', 'Barry Hertzog Park', 'Hutten Heights', 'Arbor Park', 'Kilbarchan', 'Ingagane', 'Normandien', 'Mullers Pass'],
    'Krugersdorp': ['CBD', 'Monument', 'Noordheuwel', 'Kenmare', 'Rant-en-Dal', 'Silverfields', 'Munsieville', 'Kagiso', 'Magaliesburg border', 'Muldersdrift border', 'Lanseria border', 'Cradlestone Area', 'Pinehaven', 'Ruimsig border', 'Mindalore', 'Chamdor', 'Factoria', 'Boltonia', 'Luipaardsvlei', 'Witpoortjie border'],
    'Boksburg': ['CBD', 'Sunward Park', 'Parkrand', 'Freeway Park', 'Beyers Park', 'Impala Park', 'Witfield', 'Jet Park', 'East Rand Mall Area', 'Atlasville', 'Bardene', 'Bartlett', 'Everleigh', 'Libradene', 'Cinderella', 'Reiger Park', 'Vosloorus', 'Villa Liza', 'Dawn Park', 'Windmill Park'],
    'Welkom': ['CBD', 'Bedelia', 'Dagbreek', 'Naudeville', 'Flamingo Park', 'Riebeeckstad', 'Doorn', 'Jim Fouchepark', 'Seemeeupark', 'Thabong', 'Bronville', 'St Helena', 'Eerstemyn', 'Arra-moore', 'Wesselsbron border', 'Odendaalsrus border', 'Virginia border', 'Hennenman border', 'Ventersburg border', 'Theunissen border'],
    'Polokwane': ['CBD', 'Bendor', 'Fauna Park', 'Flora Park', 'Ster Park', 'Penina Park', 'Ivy Park', 'Annadale', 'Laboria', 'Ladanna', 'Nirvana', 'Westenburg', 'Seshego', 'Mankweng', 'Turfloop', 'Dalmadutha', 'Welgelegen', 'Hospital Park', 'Thornhill', 'Broadlands'],
    'Centurion': ['CBD', 'Zwartkop', 'Lyttelton', 'Die Hoewes', 'Doringkloof', 'Irene', 'Cornwall Hill', 'Pierre van Ryneveld', 'Erasmuskloof', 'Rooihuiskraal', 'The Reeds', 'Wierda Park', 'Eldoraigne', 'Clubview', 'Hennopspark', 'Monavoni', 'Raslouw', 'Copperleaf', 'Southdowns', 'Midstream'],
    'Paarl': ['CBD', 'Northern Paarl', 'Southern Paarl', 'Courtrai', 'Lemoenkloof', 'Wellington border', 'Franschhoek border', 'Simondium', 'Val de Vie', 'Pearl Valley', 'Boschenmeer', 'Mbekweni', 'Groenheuwel', 'Chicago', 'Charleston Hill', 'Dal Josaphat', 'Noorder Paarl', 'Suider Paarl', 'Vrykyk', 'Denneburg'],
    'George': ['CBD', 'Heatherlands', 'Glenbarrie', 'Camphers Drift', 'Dennesig', 'Dormehls Drift', 'George South', 'Denneoord', 'Loerie Park', 'Eden', 'Genevafontein', 'Groenkloof', 'Twee Rivieren', 'Kraaibosch', 'Welgelegen', 'Victoria Bay', 'Herolds Bay', 'Wilderness', 'Pacaltsdorp', 'Thembalethu']
  }
};

const SearchSection: React.FC<SearchSectionProps> = ({ 
  onSearch, isLoading, mode,
  query, setQuery,
  location, setLocation,
  country, setCountry,
  area, setArea,
  radius, setRadius,
  filters, setFilters
}) => {
  const [activeSector, setActiveSector] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Track manual entry mode for dropdowns
  const [manualMode, setManualMode] = useState({
    country: false,
    city: false,
    area: false
  });

  // Derived location lists
  const countryList = useMemo(() => Object.keys(LOCATION_HIERARCHY).sort(), []);
  
  const cityList = useMemo(() => {
    if (!country || !LOCATION_HIERARCHY[country]) return [];
    return Object.keys(LOCATION_HIERARCHY[country]).sort();
  }, [country]);

  const areaList = useMemo(() => {
    if (!country || !location || !LOCATION_HIERARCHY[country]?.[location]) return [];
    return LOCATION_HIERARCHY[country][location].sort();
  }, [country, location]);

  // Handlers for hierarchical resets
  const handleCountryChange = (val: string) => {
    setCountry(val);
    setLocation(''); // Reset city
    setArea(''); // Reset area
    setManualMode(prev => ({ ...prev, city: false, area: false }));
  };

  const handleCityChange = (val: string) => {
    setLocation(val);
    setArea(''); // Reset area
    setManualMode(prev => ({ ...prev, area: false }));
  };

  const industrySectors = [
    {
      id: 'aviation-aerospace',
      label: 'Aviation & Aerospace',
      icon: 'fa-plane-up',
      color: 'text-sky-700',
      items: [
        'Commercial Airlines', 'Private Jet Charters', 'Aerospace Manufacturing', 'Avionics Systems',
        'Airport Ground Handling', 'Flight Training Academies', 'Drone Technology', 'Space Exploration Tech',
        'Aircraft Maintenance (MRO)', 'Cargo Airlines', 'Heliport Services', 'Aviation Insurance',
        'Satellite Communications', 'Defense Contractors', 'Air Traffic Control Tech', 'Component Wholesalers'
      ]
    },
    {
      id: 'agriculture-agtech',
      label: 'Agriculture & AgTech',
      icon: 'fa-tractor',
      color: 'text-emerald-800',
      items: [
        'Precision Agriculture', 'Organic Farms', 'Livestock Production', 'Greenhouse Operations',
        'AgTech Software', 'Vertical Farming', 'Food Processing Plants', 'Agricultural Machinery',
        'Hydroponics Systems', 'Irrigation Solutions', 'Aquaculture & Fisheries', 'Specialty Crop Growers',
        'Dairy Cooperatives', 'Grain Elevators', 'Ag-Chemical Suppliers', 'Sustainable Forestry'
      ]
    },
    {
      id: 'wellness-aesthetics',
      label: 'Wellness & Aesthetics',
      icon: 'fa-sparkles',
      color: 'text-pink-500',
      items: [
        'Medical Spas (MedSpas)', 'Plastic Surgery Clinics', 'Dermatology Centers', 'Aesthetic Injectors',
        'Longevity Clinics', 'IV Therapy Bars', 'Cryotherapy Centers', 'Luxury Wellness Retreats',
        'Boutique Yoga Studios', 'High-end Day Spas', 'Weight Loss Centers', 'Laser Hair Removal',
        'Hair Restoration', 'Holistic Health Centers', 'Nutrition Counseling', 'Biohacking Labs'
      ]
    },
    {
      id: 'it-cybersecurity',
      label: 'IT & Cybersecurity',
      icon: 'fa-shield-halved',
      color: 'text-blue-600',
      items: [
        'Managed Service Providers (MSPs)', 'Cybersecurity Firms', 'Cloud Infrastructure', 'IT Consulting',
        'Software Dev Shops', 'Data Analytics Firms', 'Network Security', 'SOC Providers',
        'SaaS Platforms', 'Fintech Security', 'AI Implementation', 'Disaster Recovery',
        'Compliance Consulting', 'Penetration Testing', 'Blockchain Dev', 'Edge Computing'
      ]
    },
    {
      id: 'recruitment-talent',
      label: 'Recruitment & Talent',
      icon: 'fa-user-tie',
      color: 'text-slate-800',
      items: [
        'Executive Search Firms', 'Tech Recruitment Agencies', 'Temp Staffing Ops', 'Healthcare Recruitment',
        'HR Advisory Services', 'Headhunters', 'Career Coaching', 'Employer Branding',
        'RPO Providers', 'Legal Recruitment', 'Finance Headhunters', 'Diversity & Inclusion',
        'Freelance Networks', 'Talent Marketplaces', 'Relocation Services', 'Background Check Firms'
      ]
    },
    {
      id: 'marketing-media',
      label: 'Marketing & Media',
      icon: 'fa-clapperboard',
      color: 'text-purple-600',
      items: [
        'Digital Ad Agencies', 'PR & Communications', 'Social Media Management', 'Influencer Networks',
        'Video Production', 'Branding Studios', 'SEO/SEM Agencies', 'Event Marketing',
        'Content Strategy', 'Market Research', 'Podcast Studios', 'Copywriting Services',
        'Ad Tech Platforms', 'Outdoor Advertising', 'Email Marketing Services', 'UX/UI Design'
      ]
    },
    {
      id: 'automotive',
      label: 'Automotive & Mobility',
      icon: 'fa-car-side',
      color: 'text-gray-700',
      items: [
        'Luxury Dealerships', 'EV Infrastructure', 'Fleet Management', 'Specialty Repair',
        'Custom Auto Shops', 'Ride-sharing Ops', 'Car Rentals', 'Auto Parts Mfg',
        'Autonomous Tech', 'Marine Sales', 'Motorcycle Customization', 'Logistics Ops',
        'Aviation Services', 'Tire Wholesalers', 'Collision Centers', 'RV Dealerships'
      ]
    },
    {
      id: 'legal-compliance',
      label: 'Legal & Compliance',
      icon: 'fa-gavel',
      color: 'text-amber-800',
      items: [
        'Corporate Law', 'Intellectual Property', 'Litigation Firms', 'Immigration Law',
        'Employment Law', 'Family Law', 'Estate Planning', 'Environmental Law',
        'Tax Attorneys', 'Patent Agencies', 'Compliance Consulting', 'Arbitration Services',
        'Legal Tech SaaS', 'Notary Networks', 'Contract Management', 'Forensic Accounting'
      ]
    },
    {
      id: 'real-estate',
      label: 'Real Estate Agencies',
      icon: 'fa-house-chimney-window',
      color: 'text-indigo-600',
      items: [
        'Residential Sales', 'Commercial Brokers', 'Luxury Estates', 'Property Management', 
        'Real Estate Investing', 'Vacation Rentals', 'REO Specialists', 'Foreclosure Services', 
        'Land Development', 'Industrial Real Estate', 'Appraisal Services', 'Mortgage Brokerages',
        'Senior Living Facilities', 'Student Housing', 'REIT Portfolio Managers', 'Relocation Services'
      ]
    },
    {
      id: 'logistics-hub',
      label: 'Logistics Companies',
      icon: 'fa-truck-ramp-box',
      color: 'text-orange-600',
      items: [
        'Freight Forwarding', 'Third-Party Logistics (3PL)', 'Cold Chain Logistics', 'Last-Mile Delivery', 
        'Warehousing Solutions', 'Supply Chain Tech', 'Ocean Freight', 'Air Cargo', 
        'Customs Clearance', 'Trucking Fleets', 'Intermodal Transport', 'Reverse Logistics',
        'Port Terminal Operators', 'Courier & Parcel Services', 'Distribution Management', 'Moving Companies'
      ]
    },
    {
      id: 'ecommerce',
      label: 'E-commerce Platforms',
      icon: 'fa-cart-shopping',
      color: 'text-pink-600',
      items: [
        'Direct-to-Consumer (D2C)', 'Multi-vendor Marketplaces', 'Subscription Box Services', 'Dropshipping Stores', 
        'Artisanal E-shops', 'Grocery Delivery', 'Fashion E-retail', 'Tech Gadget Stores', 
        'Digital Product Stores', 'Health & Wellness E-comm', 'Beauty Marketplaces', 'Pet Supply E-retail',
        'Automotive Parts E-shop', 'Furniture E-tailers', 'Jewelry E-commerce', 'Toy Marketplaces'
      ]
    },
    {
      id: 'saas',
      label: 'SaaS Providers',
      icon: 'fa-cloud-arrow-up',
      color: 'text-cyan-600',
      items: [
        'CRM Software', 'ERP Solutions', 'Project Management Tools', 'Cyber Security SaaS', 
        'HR Tech', 'FinTech SaaS', 'MarTech Platforms', 'EdTech SaaS', 
        'LegalTech', 'HealthTech SaaS', 'AI-driven Analytics', 'DevOps Tools',
        'Customer Support Platforms', 'Marketing Automation', 'E-learning Management', 'Logistics SaaS'
      ]
    },
    {
      id: 'healthcare-inst',
      label: 'Healthcare Institutions',
      icon: 'fa-hospital-user',
      color: 'text-emerald-600',
      items: [
        'General Hospitals', 'Specialist Clinics', 'Dental Studios', 'Mental Health Facilities', 
        'Diagnostic Labs', 'Rehabilitation Centers', 'Pediatric Clinics', 'Fertility Centers', 
        'Telemedicine Providers', 'Nursing Homes', 'Pharmaceutical Research', 'Veterinary Hospitals',
        'Eye Care Centers', 'Chiropractic Clinics', 'Home Health Care Services', 'Medical Equipment Suppliers'
      ]
    },
    {
      id: 'corporate',
      label: 'Corporate & Finance',
      icon: 'fa-building-columns',
      color: 'text-blue-600',
      items: [
        'Fintech', 'Audit Firms', 'PR Agencies', 'BPO Centers', 'Law Firms', 
        'Coworking Spaces', 'Consulting Groups', 'Tech Startups', 'Marketing Agencies', 
        'HR Consultancies', 'Insurance Brokers', 'Venture Capital', 'Design Studios', 
        'IT Support Services', 'Wealth Management', 'Investment Banking'
      ]
    },
    {
      id: 'hospitality',
      label: 'Hospitality & Leisure',
      icon: 'fa-hotel',
      color: 'text-amber-600',
      items: [
        'Luxury Hotels', 'Boutique Resorts', 'Fine Dining', 'Fitness Centers', 
        'Spa & Wellness', 'Travel Agencies', 'Event Venues', 'Catering Services', 
        'Nightclubs', 'Theme Parks', 'Golf Courses', 'Cruise Lines',
        'Bed & Breakfasts', 'Yoga Studios', 'Adventure Tourism', 'Cinema Chains'
      ]
    },
    {
      id: 'construction',
      label: 'Construction & Design',
      icon: 'fa-trowel-bricks',
      color: 'text-slate-600',
      items: [
        'Architecture Firms', 'Civil Engineering', 'General Contractors', 'Interior Design', 
        'Landscape Architects', 'HVAC Specialists', 'Electrical Contractors', 'Plumbing Services', 
        'Roofing Companies', 'Smart Home Integrators', 'Urban Planning', 'Demolition Services',
        'Flooring Experts', 'Solar Installation', 'Drywall Contractors', 'Pool Builders'
      ]
    },
    {
      id: 'education',
      label: 'Education & Academia',
      icon: 'fa-graduation-cap',
      color: 'text-rose-600',
      items: [
        'Private Schools', 'Higher Education', 'Vocational Training', 'Language Schools', 
        'Online Courseware', 'Education Consultants', 'Tutoring Centers', 'Corporate Training', 
        'LMS Platforms', 'Academic Research', 'Preschools', 'Music Schools',
        'Art Academies', 'Special Education', 'Study Abroad Agencies', 'Library Systems'
      ]
    },
    {
      id: 'manufacturing',
      label: 'Industrial & Manufacturing',
      icon: 'fa-industry',
      color: 'text-red-700',
      items: [
        'Automotive OEM', 'Textile Factories', 'Food Processing', 'Chemical Plants', 
        'Machinery Sales', 'Industrial Automation', 'Metal Fabrication', 'Electronics Assembly', 
        'Packaging Solutions', 'Aviation Components', 'Furniture Manufacturing', 'Medical Device Mfg',
        'Plastic Injection', 'Robotics Hardware', 'Paper Mills', 'Consumer Electronics'
      ]
    },
    {
      id: 'energy',
      label: 'Energy & Sustainability',
      icon: 'fa-leaf',
      color: 'text-lime-600',
      items: [
        'Solar Installers', 'Wind Energy Ops', 'EV Charging Networks', 'Sustainability Consulting', 
        'Waste Management', 'Recycling Facilities', 'Energy Auditing', 'Smart Grid Tech', 
        'Biofuel Production', 'Water Treatment', 'Environmental Testing', 'Carbon Credits',
        'HVAC Efficiency', 'Hydrogen Energy', 'Geothermal Solutions', 'LED Lighting Wholesalers'
      ]
    },
    {
      id: 'retail',
      label: 'Retail & Shops',
      icon: 'fa-shop',
      color: 'text-violet-600',
      items: [
        'Luxury Boutiques', 'Pet Stores', 'Sports Outlets', 'Electronics Stores', 
        'Home Decor', 'Florists', 'Jewelry Shops', 'Bookstores', 'Toy Stores',
        'Antique Dealers', 'Gift Shops', 'Stationery Stores', 'Supermarkets',
        'Fashion Outlets', 'Beauty Supplies', 'Bicycle Shops'
      ]
    }
  ];

  const handleTagClick = (tagValue: string) => {
    setQuery(prev => {
      const trimmedPrev = prev.trim();
      if (!trimmedPrev) return tagValue;
      if (trimmedPrev.toLowerCase().includes(tagValue.toLowerCase())) return prev;
      return `${trimmedPrev}, ${tagValue}`;
    });
  };

  const toggleFilter = (key: keyof SearchFilters) => {
    setFilters(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const setEntity = (type: EntityType) => {
    setFilters(prev => ({ ...prev, entityType: type }));
  };

  const setEmployeeRange = (range: EmployeeRange) => {
    setFilters(prev => ({ ...prev, employeeCountRange: range }));
  };

  const setFundingStage = (stage: FundingStage) => {
    setFilters(prev => ({ ...prev, fundingStage: stage }));
  };

  const handleLinkedinToggle = () => {
    setFilters(prev => {
      let nextState: SearchFilters['linkedin'];
      if (prev.linkedin === 'any') nextState = 'required';
      else if (prev.linkedin === 'required') nextState = 'excluded';
      else nextState = 'any';
      
      return {
        ...prev,
        linkedin: nextState
      };
    });
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (query.trim()) {
      onSearch();
    } else {
      const input = document.querySelector('input[placeholder*="Market Niche"]') as HTMLInputElement;
      input?.focus();
      input?.classList.add('ring-rose-500/50', 'ring-8');
      setTimeout(() => input?.classList.remove('ring-rose-500/50', 'ring-8'), 1000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'linkedin') return value !== 'any';
    if (key === 'entityType') return value !== 'any';
    if (key === 'employeeCountRange') return value !== 'any';
    if (key === 'fundingStage') return value !== 'any';
    if (key === 'targetRole') return !!value;
    if (key === 'leadCount') return false; 
    if (key === 'intentSignal') return !!value;
    return value === true;
  }).length;

  const getLinkedinButtonStyles = () => {
    if (filters.linkedin === 'required') {
      return 'bg-[#0a66c2] border-[#0a66c2] text-white shadow-lg';
    } else if (filters.linkedin === 'excluded') {
      return 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm';
    } else {
      return 'bg-white border-[#eaecf0] text-[#475467] hover:border-[#0a66c2]';
    }
  };

  if (mode === 'sidebar') {
    return (
      <aside className="w-[360px] border-r border-[#eaecf0] bg-white flex flex-col h-full shrink-0 animate-in slide-in-from-left duration-700">
        <div className="p-8 border-b border-[#f2f4f7] sticky top-0 bg-white z-10">
           <h2 className="text-[10px] font-black text-[#2160fd] uppercase tracking-[0.4em] mb-2 flex items-center gap-2">
              <i className="fas fa-microchip-ai"></i>
              Niche Discovery
           </h2>
           <h3 className="text-xl font-black text-[#101828] tracking-tighter">Industry Vertical Library</h3>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
           {industrySectors.map((sector) => (
             <div key={sector.id} className="bg-white border border-[#eaecf0] rounded-[28px] overflow-hidden transition-all shadow-sm hover:shadow-md">
                <button 
                  onClick={() => setActiveSector(activeSector === sector.id ? null : sector.id)}
                  className="w-full px-5 py-4.5 flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-[#475467] hover:bg-[#f9fafb] transition-all"
                >
                  <span className="flex items-center gap-3">
                    <i className={`fas ${sector.icon} ${sector.color} text-[11px]`}></i>
                    {sector.label}
                  </span>
                  <i className={`fas fa-chevron-down text-[9px] transition-transform ${activeSector === sector.id ? 'rotate-180' : ''}`}></i>
                </button>
                
                {activeSector === sector.id && (
                  <div className="p-5 bg-[#fcfcfd] border-t border-[#f2f4f7] animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex flex-wrap gap-2.5">
                      {sector.items.map(item => (
                        <button
                          key={item}
                          onClick={() => handleTagClick(item)}
                          className="text-[10px] px-3.5 py-2 bg-white text-[#475467] font-black rounded-xl border border-[#eaecf0] hover:border-[#2160fd] hover:text-[#2160fd] hover:bg-blue-50 transition-all shadow-sm uppercase tracking-tighter"
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
             </div>
           ))}
        </div>
        
        <div className="p-8 bg-[#f9fafb] border-t border-[#eaecf0]">
           <button
             onClick={() => handleSubmit()}
             disabled={isLoading || !query}
             className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white transition-all flex items-center justify-center gap-3 shadow-xl mb-4 ${isLoading || !query ? 'bg-[#98a2b3] opacity-50 cursor-not-allowed' : 'bg-gradient-to-r from-[#2160fd] to-blue-700 hover:shadow-blue-500/25 active:scale-95'}`}
           >
              {isLoading ? <i className="fas fa-spinner animate-spin"></i> : <><i className="fas fa-tower-broadcast"></i> Fetch Leads</>}
           </button>
           <p className="text-[9px] font-black text-[#98a2b3] uppercase tracking-[0.3em] text-center mb-1">AI-Powered Grounding Engine</p>
           <p className="text-[10px] font-bold text-[#101828] text-center opacity-60">12,500+ verified sub-sectors</p>
        </div>
      </aside>
    );
  }

  const dropdownStyles = "w-full pl-12 pr-10 py-5 bg-[#f9fafb] border border-[#eaecf0] rounded-[24px] text-xs font-bold text-[#101828] focus:bg-white focus:border-[#2160fd] outline-none transition-all appearance-none cursor-pointer";
  const manualInputStyles = "w-full pl-12 pr-12 py-5 bg-white border border-[#2160fd] rounded-[24px] text-xs font-bold text-[#101828] outline-none transition-all shadow-inner";

  return (
    <div className="bg-white border border-[#eaecf0] rounded-[48px] p-10 shadow-sm relative overflow-hidden group/matrix">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover/matrix:opacity-10 transition-opacity">
        <i className="fas fa-satellite-dish text-[120px] -rotate-12"></i>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-[11px] font-black text-[#2160fd] uppercase tracking-[0.5em] mb-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#2160fd] rounded-full animate-pulse"></span>
            Strategic Target Matrix
          </h2>
          <h3 className="text-3xl font-black text-[#101828] tracking-tighter">Command Intelligence Center</h3>
        </div>
        <div className="flex items-center gap-4">
           <button 
             onClick={() => setShowFilters(!showFilters)}
             className={`flex items-center gap-2.5 px-6 py-4.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all border ${showFilters ? 'bg-[#101828] text-white border-[#101828]' : 'bg-white text-[#475467] border-[#eaecf0] hover:border-[#2160fd]'}`}
           >
              <i className="fas fa-sliders-h"></i>
              Footprint Filters
              {activeFilterCount > 0 && <span className="ml-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px]">{activeFilterCount}</span>}
           </button>
           <button
              onClick={() => handleSubmit()}
              disabled={isLoading}
              className={`px-12 py-4.5 rounded-[24px] font-black text-[12px] uppercase tracking-[0.2em] text-white transition-all flex items-center gap-4 shadow-[0_20px_40px_-10px_rgba(33,96,253,0.4)] ${isLoading ? 'bg-[#98a2b3] opacity-50' : 'bg-gradient-to-r from-[#2160fd] to-blue-700 hover:shadow-blue-500/30 hover:-translate-y-1 active:scale-95'}`}
           >
              {isLoading ? <i className="fas fa-spinner animate-spin"></i> : <><i className="fas fa-rocket-launch"></i> Fetch Target Leads</>}
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-8">
        {/* Market Niche Niche */}
        <div className="lg:col-span-4 relative group">
          <i className="fas fa-magnifying-glass-plus absolute left-6 top-1/2 -translate-y-1/2 text-[#98a2b3] group-focus-within:text-[#2160fd] transition-colors text-base"></i>
          <input 
            type="text" 
            placeholder="Market Niche (e.g. AI SaaS, Specialty Surgeons...)" 
            className="w-full pl-14 pr-8 py-5 bg-[#f9fafb] border border-[#eaecf0] rounded-[24px] text-[15px] font-bold text-[#101828] focus:bg-white focus:ring-8 focus:ring-blue-50 focus:border-[#2160fd] outline-none transition-all"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Country Dropdown (Level 1) */}
        <div className="lg:col-span-2 relative group">
          <i className="fas fa-flag absolute left-5 top-1/2 -translate-y-1/2 text-[#98a2b3] group-focus-within:text-[#2160fd] transition-colors text-sm z-10"></i>
          {manualMode.country ? (
            <div className="relative">
              <input 
                type="text" 
                autoFocus
                placeholder="Enter Country..." 
                className={manualInputStyles}
                value={country}
                onChange={e => setCountry(e.target.value)}
              />
              <button 
                onClick={() => setManualMode({...manualMode, country: false})}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500"
              >
                <i className="fas fa-rotate-left text-[10px]"></i>
              </button>
            </div>
          ) : (
            <div className="relative">
              <select 
                className={dropdownStyles}
                value={country}
                onChange={e => {
                  if (e.target.value === 'MANUAL') setManualMode({...manualMode, country: true});
                  else handleCountryChange(e.target.value);
                }}
              >
                <option value="">Select Country</option>
                {countryList.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="MANUAL" className="font-black text-blue-600">+ Enter Manually...</option>
              </select>
              <i className="fas fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[10px]"></i>
            </div>
          )}
        </div>

        {/* Metropolis Dropdown (Level 2) */}
        <div className="lg:col-span-2 relative group">
          <i className="fas fa-city absolute left-5 top-1/2 -translate-y-1/2 text-[#98a2b3] group-focus-within:text-[#2160fd] transition-colors text-sm z-10"></i>
          {manualMode.city ? (
            <div className="relative">
              <input 
                type="text" 
                autoFocus
                placeholder="Enter City..." 
                className={manualInputStyles}
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
              <button 
                onClick={() => setManualMode({...manualMode, city: false})}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500"
                title="Return to Preset List"
              >
                <i className="fas fa-rotate-left text-[10px]"></i>
              </button>
            </div>
          ) : (
            <div className="relative">
              <select 
                className={dropdownStyles}
                value={location}
                disabled={!country && !manualMode.country}
                onChange={e => {
                  if (e.target.value === 'MANUAL') setManualMode({...manualMode, city: true});
                  else handleCityChange(e.target.value);
                }}
              >
                <option value="">{country ? 'Select Metropolis' : 'Pick Country First'}</option>
                {cityList.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="MANUAL" className="font-black text-blue-600">+ Enter Manually...</option>
              </select>
              <i className="fas fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[10px]"></i>
            </div>
          )}
        </div>

        {/* Specific Area Dropdown (Level 3) */}
        <div className="lg:col-span-2 relative group">
          <i className="fas fa-map-pin absolute left-5 top-1/2 -translate-y-1/2 text-[#98a2b3] group-focus-within:text-[#2160fd] transition-colors text-sm z-10"></i>
          {manualMode.area ? (
            <div className="relative">
              <input 
                type="text" 
                autoFocus
                placeholder="Enter Area..." 
                className={manualInputStyles}
                value={area}
                onChange={e => setArea(e.target.value)}
              />
              <button 
                onClick={() => setManualMode({...manualMode, area: false})}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500"
              >
                <i className="fas fa-rotate-left text-[10px]"></i>
              </button>
            </div>
          ) : (
            <div className="relative">
              <select 
                className={dropdownStyles}
                value={area}
                disabled={!location && !manualMode.city}
                onChange={e => {
                  if (e.target.value === 'MANUAL') setManualMode({...manualMode, area: true});
                  else setArea(e.target.value);
                }}
              >
                <option value="">{location ? 'Select Area' : 'Pick City First'}</option>
                {areaList.map(a => <option key={a} value={a}>{a}</option>)}
                <option value="MANUAL" className="font-black text-blue-600">+ Enter Manually...</option>
              </select>
              <i className="fas fa-chevron-down absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none text-[10px]"></i>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 relative group">
          <i className="fas fa-bullseye absolute left-5 top-1/2 -translate-y-1/2 text-[#2160fd] text-sm"></i>
          <input 
            type="number" 
            className="w-full pl-12 pr-12 py-5 bg-[#f9fafb] border border-[#eaecf0] rounded-[24px] text-xs font-black text-[#2160fd] focus:bg-white focus:border-[#2160fd] outline-none transition-all text-right"
            value={radius}
            onChange={e => setRadius(parseInt(e.target.value))}
            onKeyDown={handleKeyDown}
          />
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[9px] font-black text-[#98a2b3] uppercase">KM</span>
        </div>
      </div>

      {showFilters && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-500 p-8 bg-[#fcfcfd] border border-[#eaecf0] border-dashed rounded-[32px] mb-4">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-[#98a2b3] uppercase tracking-[0.3em] flex items-center gap-2">
                    <i className="fas fa-share-nodes text-[#2160fd]"></i>
                    Social Presence
                 </h4>
                 <div className="flex flex-wrap gap-2.5">
                    <button 
                      onClick={handleLinkedinToggle}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-tight ${getLinkedinButtonStyles()}`}
                    >
                       <i className={filters.linkedin === 'excluded' ? 'fas fa-user-slash' : 'fab fa-linkedin-in'}></i>
                       {filters.linkedin === 'required' ? 'LinkedIn (Req)' : filters.linkedin === 'excluded' ? 'No LinkedIn' : 'LinkedIn (Any)'}
                    </button>
                    <button 
                      onClick={() => toggleFilter('instagramRequired')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-tight ${filters.instagramRequired ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 border-transparent text-white shadow-lg' : 'bg-white border-[#eaecf0] text-[#475467] hover:border-red-400'}`}
                    >
                       <i className="fab fa-instagram"></i>
                       Instagram
                    </button>
                    <button 
                      onClick={() => toggleFilter('facebookRequired')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-tight ${filters.facebookRequired ? 'bg-[#1877f2] border-[#1877f2] text-white shadow-lg' : 'bg-white border-[#eaecf0] text-[#475467] hover:border-[#1877f2]'}`}
                    >
                       <i className="fab fa-facebook-f"></i>
                       Facebook
                    </button>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-[#98a2b3] uppercase tracking-[0.3em] flex items-center gap-2">
                    <i className="fas fa-location-dot text-emerald-500"></i>
                    Locality & Scale
                 </h4>
                 <div className="flex flex-wrap gap-2.5">
                    <button 
                      onClick={() => toggleFilter('localOnly')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-tight ${filters.localOnly ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'bg-white border-[#eaecf0] text-[#475467] hover:border-emerald-600'}`}
                    >
                       <i className="fas fa-house-user"></i>
                       Local
                    </button>
                    <button 
                      onClick={() => toggleFilter('independentOnly')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-tight ${filters.independentOnly ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-[#eaecf0] text-[#475467] hover:border-indigo-600'}`}
                    >
                       <i className="fas fa-user-shield"></i>
                       Independent
                    </button>
                    <button 
                      onClick={() => toggleFilter('physicalStorefront')}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-[10px] font-black uppercase tracking-tight ${filters.physicalStorefront ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white border-[#eaecf0] text-[#475467] hover:border-rose-600'}`}
                    >
                       <i className="fas fa-store"></i>
                       Shop
                    </button>
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-[#98a2b3] uppercase tracking-[0.3em] flex items-center gap-2">
                    <i className="fas fa-sitemap text-indigo-500"></i>
                    Business Structure
                 </h4>
                 <div className="flex flex-wrap gap-2.5">
                    {(['any', 'sole_proprietor', 'llc', 'pvt_ltd', 'public_ltd', 'partnership', 'corporation', 'non_profit'] as EntityType[]).map(type => (
                      <button 
                        key={type}
                        onClick={() => setEntity(type)}
                        className={`px-3 py-2 rounded-xl border transition-all text-[9px] font-black uppercase tracking-tighter ${filters.entityType === type ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-[#eaecf0] text-[#475467] hover:border-indigo-600'}`}
                      >
                        {type.replace('_', ' ')}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-[#98a2b3] uppercase tracking-[0.3em] flex items-center gap-2">
                    <i className="fas fa-users text-rose-500"></i>
                    Company Scale
                 </h4>
                 <div className="flex flex-wrap gap-2.5">
                    {(['any', '1-10', '11-50', '51-200', '201-500', '501+'] as EmployeeRange[]).map(range => (
                      <button 
                        key={range}
                        onClick={() => setEmployeeRange(range)}
                        className={`px-3 py-2 rounded-xl border transition-all text-[9px] font-black uppercase tracking-tighter ${filters.employeeCountRange === range ? 'bg-rose-600 border-rose-600 text-white shadow-lg' : 'bg-white border-[#eaecf0] text-[#475467] hover:border-rose-600'}`}
                      >
                        {range === 'any' ? 'Any' : `${range} Emp`}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-[#98a2b3] uppercase tracking-[0.3em] flex items-center gap-2">
                    <i className="fas fa-hand-holding-dollar text-amber-500"></i>
                    Funding Stage
                 </h4>
                 <div className="flex flex-wrap gap-2.5">
                    {(['any', 'seed', 'series_a', 'series_b', 'series_c', 'pre_ipo', 'public'] as FundingStage[]).map(stage => (
                      <button 
                        key={stage}
                        onClick={() => setFundingStage(stage)}
                        className={`px-3 py-2 rounded-xl border transition-all text-[9px] font-black uppercase tracking-tighter ${filters.fundingStage === stage ? 'bg-amber-600 border-amber-600 text-white shadow-lg' : 'bg-white border-[#eaecf0] text-[#475467] hover:border-amber-600'}`}
                      >
                        {stage.replace('_', ' ')}
                      </button>
                    ))}
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-[#98a2b3] uppercase tracking-[0.3em] flex items-center gap-2">
                    <i className="fas fa-user-tag text-blue-500"></i>
                    Persona Targeting
                 </h4>
                 <div className="relative group">
                    <i className="fas fa-id-badge absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] group-focus-within:text-[#2160fd] transition-colors text-xs"></i>
                    <input 
                      type="text" 
                      placeholder="e.g. CEO, Founder..." 
                      className="w-full pl-10 pr-4 py-3 bg-white border border-[#eaecf0] rounded-xl text-[11px] font-bold text-[#101828] focus:border-[#2160fd] outline-none transition-all"
                      value={filters.targetRole}
                      onChange={e => setFilters(prev => ({ ...prev, targetRole: e.target.value }))}
                    />
                 </div>
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-[#98a2b3] uppercase tracking-[0.3em] flex items-center gap-2">
                    <i className="fas fa-signal text-emerald-500"></i>
                    Intent Signals
                 </h4>
                 <div className="relative group">
                    <i className="fas fa-bolt absolute left-4 top-1/2 -translate-y-1/2 text-[#98a2b3] group-focus-within:text-[#2160fd] transition-colors text-xs"></i>
                    <input 
                      type="text" 
                      placeholder="e.g. Hiring, Expanding..." 
                      className="w-full pl-10 pr-4 py-3 bg-white border border-[#eaecf0] rounded-xl text-[11px] font-bold text-[#101828] focus:border-[#2160fd] outline-none transition-all"
                      value={filters.intentSignal}
                      onChange={e => setFilters(prev => ({ ...prev, intentSignal: e.target.value }))}
                    />
                 </div>
              </div>

              <div className="w-40 space-y-4">
                 <h4 className="text-[10px] font-black text-[#98a2b3] uppercase tracking-[0.3em] flex items-center gap-2">
                    <i className="fas fa-layer-group text-purple-500"></i>
                    Count
                 </h4>
                 <div className="flex items-center gap-2">
                    {[10, 25, 50].map(count => (
                      <button 
                        key={count}
                        onClick={() => setFilters(prev => ({ ...prev, leadCount: count }))}
                        className={`flex-1 py-2.5 rounded-xl border transition-all text-[10px] font-black ${filters.leadCount === count ? 'bg-[#101828] text-white border-[#101828]' : 'bg-white border-[#eaecf0] text-[#475467] hover:border-[#101828]'}`}
                      >
                         {count}
                      </button>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default SearchSection;
