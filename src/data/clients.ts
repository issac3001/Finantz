// Fictional firm staff and client businesses. Every name here is invented demo data.

export interface Staff {
  id: string;
  name: string;
  role: 'admin' | 'accountant';
  title: string;
}

export const STAFF: Staff[] = [
  { id: 'meera', name: 'Meera Kapoor', role: 'admin', title: 'Managing Partner' },
  { id: 'ananya', name: 'Ananya Iyer', role: 'accountant', title: 'Senior Accountant' },
  { id: 'rohan', name: 'Rohan Mehta', role: 'accountant', title: 'Accountant' },
  { id: 'kavya', name: 'Kavya Nair', role: 'accountant', title: 'Accountant' },
  { id: 'arjun', name: 'Arjun Desai', role: 'accountant', title: 'Accountant' },
];

export const staffName = (id: string) => STAFF.find((s) => s.id === id)?.name ?? id;

export type Health = 'strong' | 'steady' | 'stretched' | 'struggling';

export interface Client {
  id: string;
  name: string;
  industry: string;
  city: string;
  owner: string;
  accountantId: string;
  active: boolean;
  /** Typical weekly revenue in rupees. */
  scale: number;
  health: Health;
  hasBudget: boolean;
  /** Customer payment terms in days. */
  terms: number;
}

type Row = [string, string, string, string, number, Health, boolean?];

const ROWS: Row[] = [
  ['Lotus Bay Interiors', 'Interior design', 'Mumbai', 'Nisha Varma', 9.5e5, 'strong'],
  ['Northfield Dental Care', 'Healthcare clinic', 'Pune', 'Dr. Sameer Rao', 6.2e5, 'steady'],
  ['Copperleaf Foods', 'Food manufacturing', 'Bengaluru', 'Vikram Shetty', 28e5, 'stretched'],
  ['Brightwell Logistics', 'Logistics', 'Chennai', 'Farhan Qureshi', 34e5, 'steady'],
  ['Saffron Table Restaurants', 'Restaurants', 'Hyderabad', 'Leela Menon', 12e5, 'struggling'],
  ['Kestrel Software Labs', 'IT services', 'Bengaluru', 'Aditya Kulkarni', 18e5, 'strong'],
  ['Meridian Textiles', 'Textile trading', 'Surat', 'Harsh Patel', 41e5, 'stretched'],
  ['Greenway Agro Supplies', 'Agri inputs', 'Nashik', 'Sunil Pawar', 15e5, 'steady'],
  ['Aster Learning Centre', 'Education', 'Kochi', 'Rhea Thomas', 3.8e5, 'steady'],
  ['Bluepeak Engineering', 'Engineering', 'Coimbatore', 'Karthik Raman', 22e5, 'strong'],
  ['Urban Nest Realty', 'Real estate services', 'Gurugram', 'Pooja Sethi', 7.4e5, 'stretched'],
  ['Silverline Pharma Distributors', 'Pharma distribution', 'Ahmedabad', 'Jignesh Shah', 37e5, 'steady'],
  ['Monsoon Craft Brewery', 'Beverages', 'Goa', 'Tara D’Souza', 8.8e5, 'strong'],
  ['Ironbridge Fabricators', 'Metal fabrication', 'Ludhiana', 'Gurpreet Singh', 19e5, 'struggling'],
  ['Pebble & Pine Retail', 'Retail', 'Jaipur', 'Ankita Joshi', 11e5, 'steady'],
  ['Clearview Opticals', 'Retail optics', 'Lucknow', 'Imran Siddiqui', 4.6e5, 'steady'],
  ['Harbourline Exports', 'Export trading', 'Kochi', 'Joseph Mathew', 45e5, 'stretched'],
  ['Fernhill Wellness Spa', 'Wellness', 'Mysuru', 'Divya Hegde', 2.9e5, 'strong'],
  ['Quartz Print Studio', 'Printing', 'Indore', 'Nikhil Jain', 5.1e5, 'struggling'],
  ['Redstone Builders', 'Construction', 'Nagpur', 'Prakash Wagh', 31e5, 'stretched'],
  ['Tidewater Seafoods', 'Seafood processing', 'Visakhapatnam', 'Ravi Teja', 26e5, 'steady'],
  ['Orchid Event Co.', 'Events', 'Delhi', 'Simran Kaur', 6.8e5, 'stretched'],
  ['Northstar Auto Parts', 'Auto components', 'Pune', 'Mahesh Gokhale', 33e5, 'strong'],
  ['Willow Lane Bakery', 'Bakery', 'Chandigarh', 'Neha Malhotra', 2.4e5, 'steady'],
  ['Cobalt Digital Agency', 'Marketing services', 'Mumbai', 'Kabir Khanna', 9.9e5, 'strong'],
  ['Evergreen Home Health', 'Home healthcare', 'Bengaluru', 'Shalini Prasad', 5.6e5, 'steady'],
  ['Granite Peak Hardware', 'Hardware trading', 'Vadodara', 'Rajesh Desai', 14e5, 'steady', false],
  ['Sunrise Packaging', 'Packaging', 'Faridabad', 'Amit Bansal', 17e5, 'stretched'],
  ['Lighthouse Diagnostics', 'Diagnostics lab', 'Thiruvananthapuram', 'Anil Kumar', 7.9e5, 'strong'],
  ['Maple Street Cafe', 'Cafe', 'Shillong', 'Rina Lyngdoh', 1.8e5, 'struggling', false],
  ['Vertex Solar Installers', 'Renewable energy', 'Jodhpur', 'Devendra Rathore', 24e5, 'strong'],
  ['Kingfisher Travel Desk', 'Travel services', 'Kolkata', 'Sourav Banerjee', 4.2e5, 'stretched', false],
  ['Rosewood Furniture Works', 'Furniture', 'Saharanpur', 'Faisal Ahmed', 10e5, 'steady'],
  ['Aquila Security Services', 'Facility services', 'Noida', 'Col. Vinod Sharma', 13e5, 'steady'],
  ['Pinnacle Coaching Academy', 'Education', 'Kota', 'Manoj Verma', 3.1e5, 'steady', false],
  ['Cedar Ridge Resorts', 'Hospitality', 'Manali', 'Akshay Thakur', 16e5, 'stretched'],
];

const ACCOUNTANTS = STAFF.filter((s) => s.role === 'accountant').map((s) => s.id);
const TERMS = [15, 30, 30, 30, 45];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export const CLIENTS: Client[] = ROWS.map(([name, industry, city, owner, scale, health, active], i) => ({
  id: slug(name),
  name,
  industry,
  city,
  owner,
  accountantId: ACCOUNTANTS[i % ACCOUNTANTS.length],
  active: active !== false,
  scale,
  health,
  hasBudget: i % 3 !== 1,
  terms: TERMS[i % TERMS.length],
}));

export const clientById = (id: string) => CLIENTS.find((c) => c.id === id);
