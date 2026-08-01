export const PREDEFINED_RESPONSES = {
  "What is NDVI?": "NDVI (Normalized Difference Vegetation Index) is a widely used remote sensing index to assess whether or not the target being observed contains live green vegetation. It ranges from -1 to 1, where higher values indicate healthier and denser vegetation.",
  "What is NDRE?": "NDRE (Normalized Difference Red Edge) is an index that is sensitive to chlorophyll content in leaves, variability in leaf area, and background soil effects. It's particularly useful for mapping late-season crops where NDVI might saturate.",
  "What is NDWI?": "NDWI (Normalized Difference Water Index) is used to monitor changes in water content of leaves. It helps in detecting crop water stress early and managing irrigation more effectively.",
  "What is Water Stress?": "Water stress occurs when the demand for water exceeds the available amount during a certain period, or when poor quality restricts its use. In crops, it leads to reduced growth, lower yields, and visible signs like wilting or discoloration.",
  "What is Soil Moisture?": "Soil moisture is the water content of the soil. It is a key variable in controlling the exchange of water and heat energy between the land surface and the atmosphere through evaporation and plant transpiration.",
  "What is GDD?": "GDD (Growing Degree Days) is a weather-based indicator for assessing crop development. It is a measure of heat accumulation used by horticulturists, gardeners, and farmers to predict plant and animal development rates such as the date that a flower will bloom, or a crop will reach maturity."
};

export const QUICK_QUESTIONS = [
  { id: '1', icon: 'leaf', title: 'NDVI Analysis', question: 'What is NDVI?', desc: 'Understand vegetation health' },
  { id: '2', icon: 'flower-outline', title: 'NDRE Analysis', question: 'What is NDRE?', desc: 'Monitor crop nitrogen and stress' },
  { id: '3', icon: 'water-outline', title: 'NDWI Analysis', question: 'What is NDWI?', desc: 'Analyze water content in vegetation' },
  { id: '4', icon: 'thermometer-outline', title: 'Water Stress', question: 'What is Water Stress?', desc: 'Identify signs of crop water stress' },
  { id: '5', icon: 'earth', title: 'Soil Moisture', question: 'What is Soil Moisture?', desc: 'Understand soil water availability' },
  { id: '6', icon: 'trending-up', title: 'GDD', question: 'What is GDD?', desc: 'Track crop growth development' },
];
