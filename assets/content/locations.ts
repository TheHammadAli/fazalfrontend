export const locations = [
  // Pakistan Locations
  {
    id: "1",
    name: "Karachi",
    subtitle: "Sindh, Pakistan",
    type: "city",
    coordinates: { latitude: 24.8607, longitude: 67.0011 },
  },
  {
    id: "2",
    name: "Lahore",
    subtitle: "Punjab, Pakistan",
    type: "city",
    coordinates: { latitude: 31.5204, longitude: 74.3587 },
  },
  {
    id: "3",
    name: "Islamabad",
    subtitle: "Federal Capital, Pakistan",
    type: "city",
    coordinates: { latitude: 33.6844, longitude: 73.0479 },
  },
  {
    id: "4",
    name: "Faisalabad",
    subtitle: "Punjab, Pakistan",
    type: "city",
    coordinates: { latitude: 31.4504, longitude: 73.135 },
  },
  {
    id: "5",
    name: "Rawalpindi",
    subtitle: "Punjab, Pakistan",
    type: "city",
    coordinates: { latitude: 33.5651, longitude: 73.0169 },
  },
  {
    id: "6",
    name: "Multan",
    subtitle: "Punjab, Pakistan",
    type: "city",
    coordinates: { latitude: 30.1575, longitude: 71.5249 },
  },
  {
    id: "7",
    name: "Peshawar",
    subtitle: "Khyber Pakhtunkhwa, Pakistan",
    type: "city",
    coordinates: { latitude: 34.015, longitude: 71.5249 },
  },
  {
    id: "8",
    name: "Quetta",
    subtitle: "Balochistan, Pakistan",
    type: "city",
    coordinates: { latitude: 30.1798, longitude: 66.975 },
  },
  {
    id: "9",
    name: "Sialkot",
    subtitle: "Punjab, Pakistan",
    type: "city",
    coordinates: { latitude: 32.4927, longitude: 74.5313 },
  },
  {
    id: "10",
    name: "Gujranwala",
    subtitle: "Punjab, Pakistan",
    type: "city",
    coordinates: { latitude: 32.1616, longitude: 74.1883 },
  },
  {
    id: "11",
    name: "Bahawalpur",
    subtitle: "Punjab, Pakistan",
    type: "city",
    coordinates: { latitude: 29.3956, longitude: 71.6722 },
  },
  {
    id: "12",
    name: "Sargodha",
    subtitle: "Punjab, Pakistan",
    type: "city",
    coordinates: { latitude: 32.0836, longitude: 72.6712 },
  },
  {
    id: "13",
    name: "Sukkur",
    subtitle: "Sindh, Pakistan",
    type: "city",
    coordinates: { latitude: 27.7032, longitude: 68.8589 },
  },
  {
    id: "14",
    name: "Larkana",
    subtitle: "Sindh, Pakistan",
    type: "city",
    coordinates: { latitude: 27.5586, longitude: 68.212 },
  },
  {
    id: "15",
    name: "Sheikhupura",
    subtitle: "Punjab, Pakistan",
    type: "city",
    coordinates: { latitude: 31.7131, longitude: 73.9783 },
  },
  // International Locations
  {
    id: "16",
    name: "Washington D.C",
    subtitle: "DC, USA",
    type: "city",
    coordinates: { latitude: 38.9072, longitude: -77.0369 },
  },
  {
    id: "17",
    name: "New York",
    subtitle: "NY, USA",
    type: "city",
    coordinates: { latitude: 40.7128, longitude: -74.006 },
  },
  {
    id: "18",
    name: "London",
    subtitle: "England, UK",
    type: "city",
    coordinates: { latitude: 51.5074, longitude: -0.1278 },
  },
  {
    id: "19",
    name: "Dubai",
    subtitle: "UAE",
    type: "city",
    coordinates: { latitude: 25.2048, longitude: 55.2708 },
  },
  {
    id: "20",
    name: "Toronto",
    subtitle: "Ontario, Canada",
    type: "city",
    coordinates: { latitude: 43.6532, longitude: -79.3832 },
  },
];

/**
 * The shortlist a City field shows the moment it opens, since Google suggests
 * nothing until something is typed. Typing then searches the whole country.
 *
 * `locations` also carries a few foreign cities for other screens; shops are
 * Pakistan-only, matching the country restriction the autocomplete endpoint
 * already applies.
 */
export const PAKISTAN_CITY_OPTIONS = locations
  .filter((location) => location.subtitle?.includes("Pakistan"))
  .map((location) => ({
    name: location.name,
    subtitle: location.subtitle,
    coordinates: location.coordinates
      ? { lat: location.coordinates.latitude, lng: location.coordinates.longitude }
      : null,
  }));
