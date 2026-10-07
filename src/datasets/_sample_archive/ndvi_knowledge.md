---
name: NDVI Knowledge Dataset
file_name: ndvi_knowledge.md
category: Remote Sensing
description: Remote sensing reference guide covering NDVI, NDRE, NDWI, EVI calculation interpretations, satellite resolution limits, canopy health degradation rules, and trend analysis.
---

# Remote Sensing & Vegetation Indices Reference Guide

## 1. Normalized Difference Vegetation Index (NDVI)
- **Formula**: `NDVI = (NIR - RED) / (NIR + RED)`
- **Scale Range**: -1.0 to +1.0

### Health Value Classification Matrix

| NDVI Range | Vegetation Status | Typical Ground Condition |
|---|---|---|
| < 0.1 | Non-vegetated | Bare soil, rock, water, or sand |
| 0.1 – 0.25 | Very Poor / Sparse | Seedling stage, severe crop failure, or fallow land |
| 0.25 – 0.40 | Poor / Stressed | Early growth, severe water/nutrient stress, chlorosis, defoliation |
| 0.40 – 0.60 | Moderate Vigor | Developing canopy, mild stress, or moderate crop density |
| 0.60 – 0.85 | High / Optimal Vigor | Dense, healthy, actively photosynthesizing crop canopy |

## 2. Complementary Indices

### NDRE (Normalized Difference Red Edge)
- **Formula**: `NDRE = (NIR - RedEdge) / (NIR + RedEdge)`
- **Use Case**: Measures chlorophyll intensity in mid-to-late season dense canopies where standard NDVI saturates (> 0.7). Sensitive to nitrogen deficiency.

### NDWI (Normalized Difference Water Index)
- **Formula**: `NDWI = (NIR - SWIR) / (NIR + SWIR)`
- **Interpretation**: Positive values (> +0.05) indicate well-hydrated foliage. Negative values (< -0.10) signal severe canopy water stress before visible wilting.

### EVI (Enhanced Vegetation Index)
- **Formula**: `EVI = G * (NIR - RED) / (NIR + C1*RED - C2*BLUE + L)`
- **Use Case**: Corrects for soil background noise and atmospheric aerosols in high-biomass crops.

## 3. Trend Analysis Rules
- **Sudden Drop (> 0.15 within 14 days)**: Indicates acute stress — drip irrigation failure, pest outbreak, disease defoliation, or severe heatwave.
- **Gradual Drop (0.05 – 0.10 over 30 days)**: Indicates chronic stress — soil salinity buildup, slow nutrient deficiency, or root disease.
- **Increasing NDVI (+0.10 over 14 days)**: Canopy expansion, recovery post-irrigation, or vegetative flush.
