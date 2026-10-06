export const PREDEFINED_RESPONSES = {
  "What is NDVI?": "NDVI (Normalized Difference Vegetation Index) is a remote sensing index assessing live green vegetation. It ranges from -1 to 1, where higher values (>0.6) indicate healthy, dense canopy reflectance.",
  "What is NDRE?": "NDRE (Normalized Difference Red Edge) measures leaf chlorophyll content and nitrogen vigor in dense late-season crop canopies.",
  "What is NDWI?": "NDWI (Normalized Difference Water Index) monitors foliage hydration to detect crop water stress before visible wilting.",
  "What is Water Stress?": "Water stress occurs when crop water transpiration demand exceeds root-zone soil water availability.",
  "What is Soil Moisture?": "Soil moisture measures volumetric water content (VWC) in the root zone.",
  "What is GDD?": "GDD (Growing Degree Days) measures cumulative heat units predicting crop growth stages."
};

export const QUICK_QUESTIONS = [
  { 
    id: '1', 
    icon: 'search', 
    title: 'F001 Dataset Soil Moisture', 
    question: 'Answer from F001 Farm Dataset: what is the current soil moisture?', 
    desc: 'Query specific telemetry values from Farm F001' 
  },
  { 
    id: '2', 
    icon: 'git-compare-outline', 
    title: 'Compare F001 and F004', 
    question: 'Compare F001 and F004 using their datasets.', 
    desc: 'Multi-dataset comparative risk & health analysis' 
  },
  { 
    id: '3', 
    icon: 'alert-circle-outline', 
    title: 'F001 Risk Analysis', 
    question: 'Why is F001 at critical risk?', 
    desc: 'Analyze telemetry stress factors for F001' 
  },
  { 
    id: '4', 
    icon: 'leaf', 
    title: 'NDVI General Knowledge', 
    question: 'What is NDVI and how does a drop affect crop yield?', 
    desc: 'General remote sensing satellite index guide' 
  },
  { 
    id: '5', 
    icon: 'warning-outline', 
    title: 'Critical Farm Alerts', 
    question: 'Explain the critical alerts for F001.', 
    desc: 'Inspect telemetry anomaly logs for F001' 
  },
  { 
    id: '6', 
    icon: 'trending-down-outline', 
    title: 'Declining NDVI Trends', 
    question: 'Which farms have declining NDVI?', 
    desc: 'Identify canopy health drops across DigiCrop plots' 
  },
];
