/**
 * Business-type configuration layer.
 * Vertical-specific labels, category trees, units and product-form field whitelist.
 * Same core engine for every shop - from a vegetable stall to a furniture showroom -
 * only small conditional fields/labels change.
 */

import { DEFAULT_UNIT } from "@/lib/units";

export const BUSINESS_TYPES = [
  "grocery",
  "fresh_produce",
  "restaurant",
  "mobile_shop",
  "pharmacy",
  "cloth_shop",
  "perfumes_cosmetics",
  "hardware",
  "furniture_appliances",
  "auto_parts",
  "wholesale",
  "salon_spa",
  "service_freelancer",
  "jewellery",
  "hotel",
  "general",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

/** New orgs and unmigrated rows resolve here - no vertical extras. */
export const DEFAULT_BUSINESS_TYPE: BusinessType = "general";

/** Legacy DB / localStorage keys → current ids. */
const LEGACY_BUSINESS_TYPE_MAP: Record<string, BusinessType> = {
  grocery_kirana: "general",
  general_store: "general",
  manufacturer_trader: "general",
  cloth_shop_lite: "cloth_shop",
  freelancer: "service_freelancer",
  ...Object.fromEntries(
    // every current id maps to itself
    ([
      "grocery",
      "fresh_produce",
      "restaurant",
      "mobile_shop",
      "pharmacy",
      "cloth_shop",
      "perfumes_cosmetics",
      "hardware",
      "furniture_appliances",
      "auto_parts",
      "wholesale",
      "salon_spa",
      "service_freelancer",
      "jewellery",
      "hotel",
      "general",
    ] as const).map((id) => [id, id])
  ),
};

/** Every field that can appear on the product add/edit form (single inventory). */
export const PRODUCT_FORM_FIELDS = [
  "name",
  "category",
  "subcategory",
  "variant",
  "unit",
  "sku",
  "barcode",
  "pack_size",
  "batch_number",
  "hsn_code",
  "base_price",
  "manufacturing_cost",
  "vat_rate",
  "reorder_threshold",
  "mfg_date",
  "exp_date",
  "is_service",
  "is_active",
] as const;

export type ProductFormFieldId = (typeof PRODUCT_FORM_FIELDS)[number];

/** Legacy grocery/cleaning catalog (kept so older catalogs still group nicely). */
export const GROCERY_CATEGORIES = [
  "Dishwash",
  "Handwash",
  "Toilet Cleaner",
  "Bathroom Cleaner",
  "Floor Cleaner",
  "Car Wash",
  "Liquid Detergent",
] as const;

/** Category → default subcategories. Shops can add their own on top. */
export type CategoryTree = Readonly<Record<string, readonly string[]>>;

export type BusinessLabels = {
  product: string;
  productPlural: string;
  addProduct: string;
  editProduct: string;
  searchProduct: string;
  productName: string;
  stock: string;
  quantity: string;
  variant: string;
  packSize: string;
  reorderThreshold: string;
  lineImeiSerial: string;
  lineImeiSerialPlaceholder: string;
  lineBatchNumber: string;
  lineVariantTag: string;
  lineVariantTagPlaceholder: string;
  productBatchNumber: string;
  serviceToggle: string;
  lineCheckInDate: string;
  lineCheckOutDate: string;
  lineGuestIdProof: string;
};

/** Invoice-line optional fields (not the product catalog form). */
export type InvoiceLineFields = {
  lineImeiSerial: boolean;
  lineBatchNumber: boolean;
  lineVariantTag: boolean;
  /** Weight × daily metal rate pricing (jewellery only). */
  jewelleryPricing: boolean;
  /** Guest stay folio fields: check-in/out dates + ID proof (hotel only). */
  hotelStay: boolean;
};

export type BusinessTypeConfig = {
  id: BusinessType;
  label: string;
  description: string;
  /** Short line used on the website and the signup picker */
  tagline: string;
  /** Emoji used as a lightweight icon in pickers */
  emoji: string;
  labels: BusinessLabels;
  /** Top-level categories (keys of categoryTree) */
  categories: readonly string[];
  categoryTree: CategoryTree;
  /** Unit new products start with */
  defaultUnit: string;
  /** Units shown first in the unit picker */
  units: readonly string[];
  /** New products default to "no stock tracking" (menus, services) */
  defaultIsService: boolean;
  /** Sole source of truth for product form visibility */
  productFormFields: readonly ProductFormFieldId[];
  /** Invoice line extras */
  invoiceLineFields: InvoiceLineFields;
};

const BASE_LABELS: BusinessLabels = {
  product: "Product",
  productPlural: "Products",
  addProduct: "Add product",
  editProduct: "Edit product",
  searchProduct: "Search product…",
  productName: "Product name",
  stock: "Stock",
  quantity: "Qty",
  variant: "Variant",
  packSize: "Pack size",
  reorderThreshold: "Reorder threshold",
  lineImeiSerial: "IMEI / Serial Number",
  lineImeiSerialPlaceholder: "15-digit IMEI / serial",
  lineBatchNumber: "Batch number",
  lineVariantTag: "Size / Color",
  lineVariantTagPlaceholder: "Size: L, Color: Red",
  productBatchNumber: "Batch number",
  serviceToggle: "This is a service (no stock tracking)",
  lineCheckInDate: "Check-in date",
  lineCheckOutDate: "Check-out date",
  lineGuestIdProof: "Guest ID proof number",
};

const RETAIL_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "category",
  "subcategory",
  "variant",
  "unit",
  "sku",
  "barcode",
  "pack_size",
  "hsn_code",
  "base_price",
  "manufacturing_cost",
  "vat_rate",
  "reorder_threshold",
  "is_service",
  "is_active",
];

const GROCERY_PRODUCT_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "category",
  "subcategory",
  "variant",
  "unit",
  "sku",
  "barcode",
  "pack_size",
  "hsn_code",
  "base_price",
  "manufacturing_cost",
  "vat_rate",
  "reorder_threshold",
  "mfg_date",
  "exp_date",
  "is_active",
];

const FRESH_PRODUCT_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "category",
  "subcategory",
  "variant",
  "unit",
  "sku",
  "barcode",
  "hsn_code",
  "base_price",
  "manufacturing_cost",
  "vat_rate",
  "reorder_threshold",
  "exp_date",
  "is_active",
];

const MENU_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "category",
  "subcategory",
  "variant",
  "unit",
  "sku",
  "hsn_code",
  "base_price",
  "manufacturing_cost",
  "vat_rate",
  "reorder_threshold",
  "is_service",
  "is_active",
];

/** Mobile - IMEI lives on invoice lines only, not the product catalog. */
const MOBILE_PRODUCT_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "category",
  "subcategory",
  "variant",
  "unit",
  "sku",
  "barcode",
  "hsn_code",
  "base_price",
  "manufacturing_cost",
  "vat_rate",
  "reorder_threshold",
  "is_active",
];

const PHARMACY_PRODUCT_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "category",
  "subcategory",
  "variant",
  "unit",
  "sku",
  "barcode",
  "pack_size",
  "batch_number",
  "hsn_code",
  "base_price",
  "manufacturing_cost",
  "vat_rate",
  "reorder_threshold",
  "mfg_date",
  "exp_date",
  "is_active",
];

const CLOTH_PRODUCT_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "category",
  "subcategory",
  "variant",
  "unit",
  "sku",
  "barcode",
  "hsn_code",
  "base_price",
  "manufacturing_cost",
  "vat_rate",
  "reorder_threshold",
  "is_active",
];

const SERVICE_PRODUCT_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "category",
  "subcategory",
  "unit",
  "sku",
  "hsn_code",
  "base_price",
  "vat_rate",
  "reorder_threshold",
  "is_service",
  "is_active",
];

/** Jewellery - fixed base_price replaced by weight × daily metal rate engine. */
const JEWELLERY_PRODUCT_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "category",
  "subcategory",
  "sku",
  "barcode",
  "hsn_code",
  "vat_rate",
  "reorder_threshold",
  "is_active",
];

/** Hotel - room types via dedicated table; product form unused for hotel catalog. */
const HOTEL_PRODUCT_FIELDS: readonly ProductFormFieldId[] = [
  "name",
  "hsn_code",
  "base_price",
  "vat_rate",
  "is_active",
];

// ---------- category trees ----------

const GROCERY_TREE: CategoryTree = {
  "Fruits & Vegetables": ["Fresh fruits", "Fresh vegetables", "Herbs & leafy greens"],
  "Dairy & Eggs": ["Milk & laban", "Cheese & butter", "Yoghurt", "Eggs"],
  Bakery: ["Bread & khubz", "Cakes & pastries"],
  "Rice, Flour & Grains": ["Rice", "Flour & atta", "Pulses & lentils"],
  "Snacks & Packaged Food": ["Chips & crisps", "Biscuits", "Chocolates", "Noodles & pasta"],
  Beverages: ["Water", "Juices", "Soft drinks", "Tea & coffee"],
  "Household & Cleaning": [...GROCERY_CATEGORIES],
  "Personal Care": ["Soap & body wash", "Hair care", "Oral care"],
  Frozen: ["Frozen meat & fish", "Frozen vegetables", "Ice cream"],
};

const FRESH_TREE: CategoryTree = {
  Vegetables: [
    "Leafy greens",
    "Root vegetables",
    "Onions & potatoes",
    "Gourds & squash",
    "Exotic vegetables",
  ],
  Fruits: ["Citrus", "Tropical", "Apples & pears", "Berries", "Dates", "Seasonal"],
  Herbs: ["Fresh herbs", "Spices"],
  "Meat & Poultry": ["Chicken", "Lamb & mutton", "Beef"],
  "Fish & Seafood": ["Fresh fish", "Prawns & shellfish"],
  "Eggs & Dairy": ["Eggs", "Milk & laban"],
  "Dry Fruits & Nuts": ["Nuts", "Dried fruits"],
};

const RESTAURANT_TREE: CategoryTree = {
  Starters: ["Soups", "Salads", "Appetisers"],
  Mains: ["Grills", "Curries", "Rice & biryani", "Pasta & pizza", "Sandwiches & wraps"],
  Breakfast: ["Eggs", "Breakfast platters"],
  Desserts: ["Cakes", "Ice cream", "Traditional sweets"],
  Beverages: ["Hot drinks", "Cold drinks", "Fresh juices", "Shakes"],
  "Catering & Platters": ["Party platters", "Event catering"],
};

const MOBILE_TREE: CategoryTree = {
  Smartphones: ["iPhone", "Samsung", "Xiaomi", "Other brands"],
  "Feature Phones": [],
  "Laptops & Tablets": ["Laptops", "Tablets"],
  "Smart Watches": [],
  "Chargers & Cables": ["Chargers", "Cables", "Car chargers"],
  "Earphones/Headphones": ["Wired", "Wireless"],
  "Cases & Covers": [],
  "Screen Guards": [],
  "Power Banks": [],
  "Memory Cards": [],
  "Repairs & Services": ["Screen repair", "Battery replacement", "Software"],
  "Other Accessories": [],
};

const PHARMACY_TREE: CategoryTree = {
  Tablets: ["Pain relief", "Antibiotics", "Chronic care", "Allergy"],
  Syrups: ["Cough & cold", "Children"],
  Injectables: [],
  "Vitamins & Supplements": ["Multivitamins", "Minerals", "Sports nutrition"],
  "OTC / General": ["First aid", "Digestive"],
  "Surgical / Consumables": ["Bandages & dressings", "Devices", "Gloves & masks"],
  "Personal Care": ["Skin care", "Oral care", "Baby care"],
  Other: [],
};

const CLOTH_TREE: CategoryTree = {
  Men: ["Shirts", "T-shirts", "Trousers", "Kandura", "Traditional"],
  Women: ["Dresses", "Tops", "Abayas", "Traditional"],
  Kids: ["Boys", "Girls", "Babies"],
  "Ethnic Wear": [],
  "Western Wear": [],
  Footwear: ["Men", "Women", "Kids"],
  Accessories: ["Bags", "Belts", "Scarves & shaylas"],
  Other: [],
};

const PERFUME_TREE: CategoryTree = {
  Perfumes: ["Oud", "Eau de parfum", "Attar & perfume oils", "Body mists"],
  "Bakhoor & Incense": ["Bakhoor", "Oud chips", "Burners"],
  Cosmetics: ["Face", "Eyes", "Lips", "Nails"],
  "Skin Care": ["Cleansers", "Moisturisers", "Serums"],
  "Gift Sets": [],
};

const HARDWARE_TREE: CategoryTree = {
  Tools: ["Hand tools", "Power tools", "Tool accessories"],
  Plumbing: ["Pipes", "Fittings & valves", "Sanitary ware"],
  Electrical: ["Cables & wires", "Switches & sockets", "Lighting"],
  Paints: ["Interior paint", "Exterior paint", "Brushes & rollers"],
  "Building Materials": ["Cement", "Steel & rebar", "Blocks & bricks", "Sand & aggregate", "Tiles"],
  Fasteners: ["Screws & bolts", "Nails", "Anchors"],
  Safety: ["PPE", "Signage"],
};

const FURNITURE_TREE: CategoryTree = {
  "Living Room": ["Sofas", "Coffee tables", "TV units"],
  Bedroom: ["Beds", "Mattresses", "Wardrobes"],
  Dining: ["Dining sets", "Chairs"],
  Office: ["Desks", "Office chairs", "Storage"],
  "Kitchen Appliances": ["Refrigerators", "Cookers & ovens", "Microwaves", "Small appliances"],
  Laundry: ["Washing machines", "Dryers"],
  "Cooling & Heating": ["Air conditioners", "Fans", "Water heaters"],
  "TV & Audio": ["Televisions", "Sound systems"],
  "Delivery & Installation": [],
};

const AUTO_TREE: CategoryTree = {
  Engine: ["Filters", "Belts & hoses", "Spark plugs"],
  Brakes: ["Brake pads", "Discs & drums"],
  Electrical: ["Batteries", "Lights & bulbs"],
  "Tyres & Wheels": ["Tyres", "Rims", "Tubes"],
  "Oils & Fluids": ["Engine oil", "Coolant", "Brake fluid"],
  "Body & Accessories": ["Mirrors", "Wipers", "Accessories"],
  "Labour & Services": ["Servicing", "Repairs", "Diagnostics"],
};

const WHOLESALE_TREE: CategoryTree = {
  "Food & Beverages": ["Packaged food", "Beverages", "Confectionery"],
  Household: ["Cleaning", "Paper products", "Plastics & disposables"],
  "Personal Care": ["Toiletries", "Cosmetics"],
  "Electronics & Accessories": [],
  "Stationery & Office": [],
  "Industrial Supplies": [],
};

const SALON_TREE: CategoryTree = {
  Hair: ["Haircut & styling", "Colour", "Treatments"],
  "Skin & Face": ["Facials", "Threading & waxing"],
  Nails: ["Manicure", "Pedicure", "Nail art"],
  "Massage & Spa": ["Massage", "Moroccan bath"],
  "Bridal & Packages": [],
  "Retail Products": ["Hair products", "Skin care"],
};

const SERVICE_TREE: CategoryTree = {
  Consulting: [],
  Design: ["Branding", "UI / UX", "Print"],
  Development: ["Websites", "Mobile apps", "Integrations"],
  "Writing / Content": [],
  Marketing: ["Social media", "SEO", "Ads"],
  Training: [],
  Retainers: [],
  Other: [],
};

const JEWELLERY_TREE: CategoryTree = {
  Ring: ["Engagement", "Daily wear"],
  Necklace: [],
  Bangle: [],
  Chain: [],
  Earring: [],
  Bracelet: [],
  Coin: [],
  Other: [],
};

const HOTEL_TREE: CategoryTree = {
  "Standard Room": [],
  "Deluxe Room": [],
  Suite: [],
  "Dormitory / Shared": [],
  "Extra Bed": [],
  "Amenities / Add-on": [],
  Other: [],
};

const GENERAL_TREE: CategoryTree = {
  Stationery: [],
  Household: [],
  "Snacks / Packaged Food": [],
  Beverages: [],
  "Personal Care": [],
  "Electronics Accessories": [],
  Other: [],
};

function cfg(
  id: BusinessType,
  label: string,
  description: string,
  overrides: {
    tagline: string;
    emoji: string;
    labels?: Partial<BusinessLabels>;
    categoryTree: CategoryTree;
    defaultUnit?: string;
    units?: readonly string[];
    defaultIsService?: boolean;
    productFormFields: readonly ProductFormFieldId[];
    invoiceLineFields?: Partial<InvoiceLineFields>;
  }
): BusinessTypeConfig {
  return {
    id,
    label,
    description,
    tagline: overrides.tagline,
    emoji: overrides.emoji,
    labels: { ...BASE_LABELS, ...overrides.labels },
    categories: Object.keys(overrides.categoryTree),
    categoryTree: overrides.categoryTree,
    defaultUnit: overrides.defaultUnit ?? DEFAULT_UNIT,
    units: overrides.units ?? ["pcs", "box", "pack", "kg", "l"],
    defaultIsService: overrides.defaultIsService ?? false,
    productFormFields: overrides.productFormFields,
    invoiceLineFields: {
      lineImeiSerial: false,
      lineBatchNumber: false,
      lineVariantTag: false,
      jewelleryPricing: false,
      hotelStay: false,
      ...overrides.invoiceLineFields,
    },
  };
}

export const BUSINESS_TYPE_CONFIG: Record<BusinessType, BusinessTypeConfig> = {
  grocery: cfg("grocery", "Grocery / Supermarket", "Everyday retail - stock, billing, and expiry dates.", {
    tagline: "Loose and packed goods, expiry dates, barcode billing",
    emoji: "🛒",
    categoryTree: GROCERY_TREE,
    units: ["pcs", "kg", "g", "l", "ml", "pack", "box", "dozen", "bottle", "can", "bag", "tray"],
    productFormFields: GROCERY_PRODUCT_FIELDS,
  }),
  fresh_produce: cfg(
    "fresh_produce",
    "Fruits, Vegetables & Fresh Food",
    "Sell by weight - kg, grams, bunches and boxes, with decimals.",
    {
      tagline: "Sell by the kilo - 1.25 kg of tomatoes, priced to the fils",
      emoji: "🥬",
      categoryTree: FRESH_TREE,
      defaultUnit: "kg",
      units: ["kg", "g", "pcs", "bunch", "box", "dozen", "tray", "bag"],
      productFormFields: FRESH_PRODUCT_FIELDS,
      labels: { reorderThreshold: "Reorder below" },
    }
  ),
  restaurant: cfg(
    "restaurant",
    "Restaurant / Café",
    "Menu billing by plate, portion or kilo - stock optional per item.",
    {
      tagline: "Menus, portions and catering orders",
      emoji: "🍽️",
      categoryTree: RESTAURANT_TREE,
      defaultUnit: "plate",
      units: ["plate", "pcs", "set", "kg", "l", "bottle", "can"],
      defaultIsService: true,
      productFormFields: MENU_FIELDS,
      invoiceLineFields: { lineVariantTag: true },
      labels: {
        product: "Menu item",
        productPlural: "Menu",
        addProduct: "Add menu item",
        editProduct: "Edit menu item",
        searchProduct: "Search the menu…",
        productName: "Dish / item name",
        variant: "Size / portion",
        serviceToggle: "Made to order (don't track stock)",
        lineVariantTag: "Table / order note",
        lineVariantTagPlaceholder: "Table 4, no onions",
      },
    }
  ),
  mobile_shop: cfg(
    "mobile_shop",
    "Mobile / Electronics Shop",
    "Phones and accessories - IMEI/serial captured per invoice line.",
    {
      tagline: "IMEI and serial numbers on every sale",
      emoji: "📱",
      categoryTree: MOBILE_TREE,
      units: ["pcs", "set", "pair", "box", "service"],
      productFormFields: MOBILE_PRODUCT_FIELDS,
      invoiceLineFields: { lineImeiSerial: true },
    }
  ),
  pharmacy: cfg(
    "pharmacy",
    "Pharmacy / Medical Store",
    "Medicines - batch and expiry on products; batch on invoice lines.",
    {
      tagline: "Batch and expiry on every strip and bottle",
      emoji: "💊",
      categoryTree: PHARMACY_TREE,
      units: ["pcs", "box", "pack", "bottle", "ml", "g", "can"],
      productFormFields: PHARMACY_PRODUCT_FIELDS,
      invoiceLineFields: { lineBatchNumber: true },
    }
  ),
  cloth_shop: cfg(
    "cloth_shop",
    "Clothing Shop",
    "Apparel - free-text Size / Color tag on products and invoice lines.",
    {
      tagline: "Sizes and colours, by the piece or by the metre",
      emoji: "👕",
      categoryTree: CLOTH_TREE,
      units: ["pcs", "pair", "set", "dozen", "m"],
      productFormFields: CLOTH_PRODUCT_FIELDS,
      invoiceLineFields: { lineVariantTag: true },
      labels: {
        variant: "Size / Color",
        lineVariantTag: "Size / Color",
      },
    }
  ),
  perfumes_cosmetics: cfg(
    "perfumes_cosmetics",
    "Perfumes & Cosmetics",
    "Oud, attar and beauty - sell by bottle, ml or tola.",
    {
      tagline: "Oud by the tola, attar by the ml, gift sets by the box",
      emoji: "🧴",
      categoryTree: PERFUME_TREE,
      units: ["pcs", "ml", "tola", "g", "bottle", "set"],
      productFormFields: RETAIL_FIELDS,
      invoiceLineFields: { lineBatchNumber: true },
      labels: { lineBatchNumber: "Batch / blend" },
    }
  ),
  hardware: cfg(
    "hardware",
    "Hardware & Building Materials",
    "Tools to tonnes - pieces, bags, metres, square feet and kilos.",
    {
      tagline: "Bags of cement, metres of cable, boxes of screws",
      emoji: "🛠️",
      categoryTree: HARDWARE_TREE,
      units: ["pcs", "bag", "kg", "ton", "m", "ft", "cm", "sqm", "sqft", "box", "l", "gal", "can", "roll"],
      productFormFields: RETAIL_FIELDS,
    }
  ),
  furniture_appliances: cfg(
    "furniture_appliances",
    "Furniture & Appliances",
    "Big-ticket items - serial numbers and finishes on every invoice line.",
    {
      tagline: "Big-ticket sales with serial numbers and finishes",
      emoji: "🛋️",
      categoryTree: FURNITURE_TREE,
      units: ["pcs", "set", "sqm", "sqft", "m", "service"],
      productFormFields: RETAIL_FIELDS,
      invoiceLineFields: { lineImeiSerial: true, lineVariantTag: true },
      labels: {
        lineImeiSerial: "Serial number",
        lineImeiSerialPlaceholder: "Model / serial no.",
        lineVariantTag: "Colour / finish",
        lineVariantTagPlaceholder: "Walnut, grey fabric",
        variant: "Colour / finish",
      },
    }
  ),
  auto_parts: cfg(
    "auto_parts",
    "Auto Parts & Garage",
    "Parts, oils and labour hours - with the vehicle on every line.",
    {
      tagline: "Parts, oils and labour, tagged to the vehicle",
      emoji: "🚗",
      categoryTree: AUTO_TREE,
      units: ["pcs", "set", "pair", "l", "hour", "service"],
      productFormFields: RETAIL_FIELDS,
      invoiceLineFields: { lineVariantTag: true },
      labels: {
        lineVariantTag: "Vehicle (plate / model)",
        lineVariantTagPlaceholder: "Dubai A 12345 · Corolla 2019",
      },
    }
  ),
  wholesale: cfg(
    "wholesale",
    "Wholesale / Distribution",
    "Cartons, cases and bulk packs for trade customers.",
    {
      tagline: "Cartons and cases for trade customers",
      emoji: "📦",
      categoryTree: WHOLESALE_TREE,
      defaultUnit: "carton",
      units: ["carton", "box", "pack", "pcs", "dozen", "kg", "bag", "ton", "l"],
      productFormFields: RETAIL_FIELDS,
    }
  ),
  salon_spa: cfg(
    "salon_spa",
    "Salon & Spa",
    "Services and retail products on one bill.",
    {
      tagline: "Services and retail products on one bill",
      emoji: "💇",
      categoryTree: SALON_TREE,
      defaultUnit: "service",
      units: ["service", "hour", "pcs", "set"],
      defaultIsService: true,
      productFormFields: SERVICE_PRODUCT_FIELDS,
      labels: {
        product: "Service / product",
        productPlural: "Services & Products",
        addProduct: "Add service / product",
        editProduct: "Edit service / product",
        searchProduct: "Search services / products…",
        productName: "Name",
        stock: "Availability",
      },
    }
  ),
  service_freelancer: cfg(
    "service_freelancer",
    "Freelancer / Service Business",
    "Services billing - optional stock tracking per item.",
    {
      tagline: "Hours, days and retainers",
      emoji: "💼",
      categoryTree: SERVICE_TREE,
      defaultUnit: "service",
      units: ["service", "hour", "day", "month", "pcs"],
      defaultIsService: true,
      productFormFields: SERVICE_PRODUCT_FIELDS,
      labels: {
        product: "Product / Service",
        productPlural: "Products / Services",
        addProduct: "Add product / service",
        editProduct: "Edit product / service",
        searchProduct: "Search products / services…",
        productName: "Name",
        stock: "Availability",
        quantity: "Qty / units",
        reorderThreshold: "Reorder threshold (stocked items)",
      },
    }
  ),
  jewellery: cfg(
    "jewellery",
    "Jewellery Shop",
    "Gold/silver weight × daily rates, making charges, and hallmark numbers.",
    {
      tagline: "Weight × today's gold rate, making charges included",
      emoji: "💍",
      categoryTree: JEWELLERY_TREE,
      units: ["pcs", "g", "tola", "set", "pair"],
      productFormFields: JEWELLERY_PRODUCT_FIELDS,
      invoiceLineFields: { jewelleryPricing: true },
      labels: {
        product: "Ornament",
        productPlural: "Ornaments",
        addProduct: "Add ornament",
        editProduct: "Edit ornament",
        searchProduct: "Search ornaments…",
        productName: "Ornament name",
        stock: "Pieces in stock",
        quantity: "Pieces",
      },
    }
  ),
  hotel: cfg("hotel", "Hotel / Guest House", "Guest folio billing with room types, physical rooms, and date-based bookings.", {
    tagline: "Room nights, folios and bookings",
    emoji: "🏨",
    categoryTree: HOTEL_TREE,
    defaultUnit: "night",
    units: ["night"],
    defaultIsService: true,
    productFormFields: HOTEL_PRODUCT_FIELDS,
    invoiceLineFields: { hotelStay: true },
    labels: {
      product: "Room type",
      productPlural: "Room Types",
      addProduct: "Add room type",
      editProduct: "Edit room type",
      searchProduct: "Search room types…",
      productName: "Room type name",
      stock: "Availability",
      quantity: "Nights",
      lineCheckInDate: "Check-in date",
      lineCheckOutDate: "Check-out date",
      lineGuestIdProof: "Guest ID proof number",
    },
  }),
  general: cfg("general", "Other / General", "Standard billing and inventory - works for any shop or trade.", {
    tagline: "Any shop, any trade",
    emoji: "🏪",
    categoryTree: GENERAL_TREE,
    units: ["pcs", "kg", "g", "l", "ml", "m", "box", "pack", "dozen", "set", "hour", "service"],
    productFormFields: RETAIL_FIELDS,
  }),
};

export const BUSINESS_TYPE_OPTIONS = BUSINESS_TYPES.map((id) => ({
  value: id,
  label: BUSINESS_TYPE_CONFIG[id].label,
  description: BUSINESS_TYPE_CONFIG[id].description,
  tagline: BUSINESS_TYPE_CONFIG[id].tagline,
  emoji: BUSINESS_TYPE_CONFIG[id].emoji,
}));

export function isBusinessType(value: unknown): value is BusinessType {
  return typeof value === "string" && (BUSINESS_TYPES as readonly string[]).includes(value);
}

export function normalizeBusinessType(value: unknown): BusinessType {
  if (typeof value !== "string" || !value.trim()) return DEFAULT_BUSINESS_TYPE;
  const mapped = LEGACY_BUSINESS_TYPE_MAP[value.trim()];
  return mapped ?? DEFAULT_BUSINESS_TYPE;
}

export function getBusinessTypeConfig(type: unknown): BusinessTypeConfig {
  return BUSINESS_TYPE_CONFIG[normalizeBusinessType(type)];
}

export function businessTypeLabel(type: unknown): string {
  return getBusinessTypeConfig(type).label;
}

export function categoriesForBusinessType(type: unknown): readonly string[] {
  return getBusinessTypeConfig(type).categories;
}

export function productFormFieldSet(type: unknown): Set<ProductFormFieldId> {
  return new Set(getBusinessTypeConfig(type).productFormFields);
}

export function showsProductFormField(type: unknown, field: ProductFormFieldId): boolean {
  return productFormFieldSet(type).has(field);
}

export function getInvoiceLineFields(type: unknown): InvoiceLineFields {
  return getBusinessTypeConfig(type).invoiceLineFields;
}

export function isJewelleryBusiness(type: unknown): boolean {
  return normalizeBusinessType(type) === "jewellery";
}

export function isHotelBusiness(type: unknown): boolean {
  return normalizeBusinessType(type) === "hotel";
}

/**
 * Nights between check-in and check-out (checkout exclusive).
 * Informational only - never used for availability checks.
 */
export function nightsFromStayDates(
  checkIn: string | null | undefined,
  checkOut: string | null | undefined
): number | null {
  if (!checkIn || !checkOut) return null;
  const a = Date.parse(`${checkIn}T00:00:00`);
  const b = Date.parse(`${checkOut}T00:00:00`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

/** Merge defaults with any custom categories already used on products. */
export function categoryOptionsForBusinessType(
  type: unknown,
  existingCategories: Iterable<string> = []
): string[] {
  const defaults = categoriesForBusinessType(type);
  const seen = new Set<string>(defaults);
  const extras: string[] = [];
  for (const c of Array.from(existingCategories)) {
    const trimmed = c?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    extras.push(trimmed);
  }
  extras.sort((a, b) => a.localeCompare(b));
  return [...defaults, ...extras];
}
