"""
MOIL-PRAGYA: Mining & Geological Data Engine
Central Indian Manganese Belt (Balaghat, Dongri Buzurg, Chikla, Gumgaon, Tirodi)
Provides space satellite indices, 3D borehole lithology, geostatistical voxel modeling,
operational constraints, and prescriptive optimization.
"""

import math
import numpy as np

# MOIL Mine Profiles
MOIL_MINES = {
    "balaghat": {
        "id": "balaghat",
        "name": "Balaghat Mine (Flagship Underground)",
        "state": "Madhya Pradesh",
        "district": "Balaghat",
        "type": "Underground (Deepest in Asia - 385m+)",
        "lat": 21.8672,
        "lon": 80.2014,
        "elevation": 320,
        "total_reserves_mt": 24.8,
        "avg_grade_mn": 44.5,
        "primary_ore": "Braunite & Pyrolusite (High Grade)",
        "host_rock": "Mansar Formation, Sausar Group (Gondite & Quartz-mica schist)",
        "daily_target_tonnes": 1450,
        "current_shortfall_risk": "Moderate (24%)",
        "description": "Deepest manganese mine in Asia with vertical shaft hoisting and high-grade braunite ore bodies dipping steeply at 65-75°."
    },
    "dongri_buzurg": {
        "id": "dongri_buzurg",
        "name": "Dongri Buzurg Mine",
        "state": "Maharashtra",
        "district": "Bhandara",
        "type": "Opencast & Underground",
        "lat": 21.5369,
        "lon": 79.6841,
        "elevation": 290,
        "total_reserves_mt": 18.2,
        "avg_grade_mn": 42.0,
        "primary_ore": "Pyrolusite (High-purity Manganese Dioxide for batteries/chemicals)",
        "host_rock": "Sausar Group Gondite series",
        "daily_target_tonnes": 1200,
        "current_shortfall_risk": "High (41% due to Monsoon sump flooding)",
        "description": "Renowned for dioxide ore (electrolytic manganese dioxide grade) with extensive opencast benches vulnerable to monsoonal rainfall."
    },
    "chikla": {
        "id": "chikla",
        "name": "Chikla Mine",
        "state": "Maharashtra",
        "district": "Bhandara",
        "type": "Underground & Semi-mechanized",
        "lat": 21.5583,
        "lon": 79.7431,
        "elevation": 305,
        "total_reserves_mt": 9.6,
        "avg_grade_mn": 39.8,
        "primary_ore": "Braunite with Silico-Manganese beds",
        "host_rock": "Sausar Group Schists",
        "daily_target_tonnes": 800,
        "current_shortfall_risk": "Low (12%)",
        "description": "Stope-and-pillar underground extraction with continuous ore tramming to central skip."
    },
    "gumgaon": {
        "id": "gumgaon",
        "name": "Gumgaon Mine",
        "state": "Maharashtra",
        "district": "Nagpur",
        "type": "Underground",
        "lat": 21.3653,
        "lon": 79.0232,
        "elevation": 310,
        "total_reserves_mt": 7.4,
        "avg_grade_mn": 41.2,
        "primary_ore": "Braunite & Jacobsite",
        "host_rock": "Gondite & Rhodonite bands",
        "daily_target_tonnes": 650,
        "current_shortfall_risk": "Moderate (28%)",
        "description": "Underground mine situated near Nagpur with multiple haulage levels and sub-level caving."
    },
    "tirodi": {
        "id": "tirodi",
        "name": "Tirodi Mine",
        "state": "Madhya Pradesh",
        "district": "Balaghat",
        "type": "Opencast Heavy HEMM",
        "lat": 21.6881,
        "lon": 79.7042,
        "elevation": 335,
        "total_reserves_mt": 12.1,
        "avg_grade_mn": 38.5,
        "primary_ore": "Psilomelane & Braunite",
        "host_rock": "Tirodi Biotite Gneiss & Gondite",
        "daily_target_tonnes": 950,
        "current_shortfall_risk": "High (36% haul road slippage)",
        "description": "Multi-bench opencast mine deploying 60-tonne dumpers and heavy hydraulic excavators."
    },
    "joda_keonjhar": {
        "id": "joda_keonjhar",
        "name": "Joda West & Barbil Complex (Keonjhar Belt)",
        "state": "Odisha",
        "district": "Keonjhar",
        "type": "Mechanized Opencast & Terrace Benches",
        "lat": 22.0167,
        "lon": 85.4333,
        "elevation": 520,
        "total_reserves_mt": 21.4,
        "avg_grade_mn": 43.8,
        "primary_ore": "Pyrolusite & Psilomelane (Dioxide & Ferro Grade)",
        "host_rock": "Bonai-Keonjhar Iron Ore Group (IOG) / Manganiferous Shale",
        "daily_target_tonnes": 1350,
        "current_shortfall_risk": "Moderate (22% Monsoon pit accumulation)",
        "description": "Premier manganese hub in Odisha's Bonai-Keonjhar horse-shoe synclinorium with exceptional high-grade dioxide pockets."
    },
    "koira_sundargarh": {
        "id": "koira_sundargarh",
        "name": "Koira-Malda Heavy Manganese Mine (Sundargarh Belt)",
        "state": "Odisha",
        "district": "Sundargarh",
        "type": "Opencast Heavy HEMM & Stripping",
        "lat": 21.9056,
        "lon": 85.2417,
        "elevation": 480,
        "total_reserves_mt": 16.8,
        "avg_grade_mn": 40.5,
        "primary_ore": "Cryptomelane, Pyrolusite & Wad",
        "host_rock": "Bonai Supergroup Shales & Banded Chert",
        "daily_target_tonnes": 1100,
        "current_shortfall_risk": "High (35% Haul road laterite slippage)",
        "description": "Strategic manganese resource in Sundargarh district providing blended feed to major steel and ferro-alloy complexes in Eastern India."
    },
    "nishikhal_rayagada": {
        "id": "nishikhal_rayagada",
        "name": "Nishikhal High-Grade Deposit (Rayagada Belt)",
        "state": "Odisha",
        "district": "Rayagada",
        "type": "Semi-Mechanized Hill Slope & Quarry",
        "lat": 19.2167,
        "lon": 83.2167,
        "elevation": 410,
        "total_reserves_mt": 11.2,
        "avg_grade_mn": 45.2,
        "primary_ore": "High-purity Braunite & Pyrolusite",
        "host_rock": "Eastern Ghats Mobile Belt (Khondalite & Charnockite Suite)",
        "daily_target_tonnes": 850,
        "current_shortfall_risk": "Low (15%)",
        "description": "Premium metallurgical grade deposit in Southern Odisha renowned for high Mn:Fe ratio and low phosphorus impurities."
    }
}

def generate_satellite_layers(mine_id="balaghat"):
    """
    Generates synthetic space technology remote sensing grid data for a mine:
    - Manganese Oxide Signature Index (MOSI): SWIR1/VNIR absorption
    - NDVI: vegetation stress anomaly
    - LST: Land Surface Temperature thermal anomaly
    - Soil Moisture Index (SMI): water accumulation in fractures
    - Structural Lineaments: fault vectors & synclinal fold axes
    """
    mine = MOIL_MINES.get(mine_id, MOIL_MINES["balaghat"])
    clat, clon = mine["lat"], mine["lon"]

    # Generate 12x12 spatial grid around the mine lease (~6km x 6km)
    grid_size = 14
    step = 0.005 # ~550 meters
    min_lat, min_lon = clat - (grid_size/2)*step, clon - (grid_size/2)*step

    points = []
    # Base syncline strike angle ~ 65 degrees (characteristic of Sausar fold belt)
    angle_rad = math.radians(65)
    cos_a, sin_a = math.cos(angle_rad), math.sin(angle_rad)

    for i in range(grid_size):
        for j in range(grid_size):
            plat = min_lat + i * step
            plon = min_lon + j * step

            # Distance along and perpendicular to mineralized shear zone
            dx = (plon - clon) * 111.0 # km
            dy = (plat - clat) * 111.0 # km
            u = dx * cos_a + dy * sin_a # along strike
            v = -dx * sin_a + dy * cos_a # cross strike

            # Manganese mineralization band along v ~= 0 with some folding ripples
            fold_offset = 0.3 * math.sin(u * 1.8)
            dist_to_reef = abs(v - fold_offset)

            # MOSI: High near manganese reef outcrop, drops off
            mosi_val = 0.25 + 0.65 * math.exp(-(dist_to_reef**2) / 0.7) + np.random.normal(0, 0.03)
            mosi_val = max(0.05, min(0.95, float(mosi_val)))

            # NDVI: Mineral gossans and open pits have lower vegetation (0.15 - 0.25)
            # Surroundings have higher vegetation (0.55 - 0.75)
            ndvi_val = 0.65 - 0.40 * math.exp(-(dist_to_reef**2) / 1.1) + np.random.normal(0, 0.02)
            ndvi_val = max(0.1, min(0.85, float(ndvi_val)))

            # LST: High density metallic ore & bare rocky benches show high thermal inertia (34-41°C)
            lst_celsius = 31.5 + 8.5 * math.exp(-(dist_to_reef**2) / 0.85) + np.random.normal(0, 0.4)
            lst_celsius = float(lst_celsius)

            # Soil Moisture: Depressions and fault fracture lines hold moisture
            smi_val = 0.22 + 0.35 * (1.0 / (1.0 + abs(v - 0.4))) + np.random.normal(0, 0.02)
            smi_val = max(0.05, min(0.85, float(smi_val)))

            # Combined AI Prospectivity Index (Surface indicator fusion)
            # High MOSI + Low NDVI + High LST + Structural proximity = Prime Manganese Target
            prospectivity = (mosi_val * 0.45) + ((1.0 - ndvi_val) * 0.25) + ((lst_celsius - 30)/12.0 * 0.20) + ((1.0 - min(1.0, dist_to_reef)) * 0.10)
            prospectivity = max(0.0, min(1.0, float(prospectivity)))

            points.append({
                "lat": round(plat, 5),
                "lon": round(plon, 5),
                "mosi": round(mosi_val, 3),
                "ndvi": round(ndvi_val, 3),
                "lst": round(lst_celsius, 1),
                "smi": round(smi_val, 3),
                "prospectivity": round(prospectivity, 3),
                "geology": "Pyrolusite/Gondite Reef" if dist_to_reef < 0.4 else ("Quartz-Mica Schist" if dist_to_reef < 1.2 else "Host Gneiss/Amphibolite")
            })

    # Structural lineaments (fault lines & fold axes)
    if mine_id == "joda_keonjhar":
        lineaments = [
            {
                "name": "Bonai-Keonjhar Horse-Shoe Syncline Axis",
                "type": "Regional Synclinorium Axis",
                "strike": "NNE-SSW (N20°E)",
                "coordinates": [
                    [clat - 0.025, clon - 0.015],
                    [clat - 0.008, clon - 0.005],
                    [clat + 0.012, clon + 0.008],
                    [clat + 0.030, clon + 0.022]
                ]
            },
            {
                "name": "Barbil-Joda Metallogenic Thrust Fault",
                "type": "Major Low-Angle Thrust",
                "strike": "Steep 60° WNW Dip",
                "coordinates": [
                    [clat - 0.020, clon + 0.018],
                    [clat - 0.002, clon + 0.008],
                    [clat + 0.018, clon - 0.002],
                    [clat + 0.035, clon - 0.010]
                ]
            },
            {
                "name": "Kundru-Bichakundi Fault F-1",
                "type": "Transverse Fault (High Water Inflow)",
                "strike": "ENE-WSW (N75°E)",
                "coordinates": [
                    [clat + 0.018, clon - 0.025],
                    [clat + 0.004, clon - 0.005],
                    [clat - 0.012, clon + 0.018]
                ]
            }
        ]
        anomalies = [
            {
                "id": "OD-ANOM-01",
                "name": "Bichakundi Lateritoid Dioxide Cap",
                "lat": round(clat + 0.009, 5),
                "lon": round(clon + 0.014, 5),
                "confidence": 94.6,
                "signature": "Peak MOSI (0.91), High SWIR2 Absorption, Low NDVI (0.16)",
                "estimated_grade": "48.2% Mn (Electrolytic Dioxide Grade)",
                "status": "Targeted for Immediate Terrace Development"
            },
            {
                "id": "OD-ANOM-02",
                "name": "Kasia North Manganese Lobe",
                "lat": round(clat + 0.018, 5),
                "lon": round(clon - 0.008, 5),
                "confidence": 88.2,
                "signature": "Distinct Pyrolusite Reflectance & Soil Moisture Fracture",
                "estimated_grade": "41.5% Mn (Ferro-Manganese ROM)",
                "status": "Infill Diamond Core Drilling Scheduled"
            },
            {
                "id": "OD-ANOM-03",
                "name": "Joda Deep Synclinal Trough",
                "lat": round(clat - 0.014, 5),
                "lon": round(clon + 0.011, 5),
                "confidence": 81.7,
                "signature": "Deep Thermal Inertia Anomaly (+3.8°C above shale)",
                "estimated_grade": "37.4% Mn (Silico-Mn Grade)",
                "status": "Geophysical IP/Resistivity Sounding Queued"
            }
        ]
    elif mine_id == "koira_sundargarh":
        lineaments = [
            {
                "name": "Koira-Malda Regional Shear Zone",
                "type": "Ductile Shear Corridor",
                "strike": "N-S (N05°E)",
                "coordinates": [
                    [clat - 0.028, clon - 0.005],
                    [clat - 0.010, clon - 0.002],
                    [clat + 0.010, clon + 0.004],
                    [clat + 0.032, clon + 0.009]
                ]
            },
            {
                "name": "Tensa-Patmunda Boundary Fault",
                "type": "Normal Fault (Gouge Zone)",
                "strike": "NW-SE (N40°W)",
                "coordinates": [
                    [clat + 0.022, clon - 0.025],
                    [clat + 0.005, clon - 0.008],
                    [clat - 0.015, clon + 0.012]
                ]
            }
        ]
        anomalies = [
            {
                "id": "OD-ANOM-04",
                "name": "Malda West Concealed Ore Body",
                "lat": round(clat + 0.007, 5),
                "lon": round(clon - 0.012, 5),
                "confidence": 91.0,
                "signature": "High MOSI (0.86) along Manganiferous Shale Horizon",
                "estimated_grade": "42.0% Mn (Cryptomelane/Pyrolusite)",
                "status": "Recommended for Scout Drilling"
            },
            {
                "id": "OD-ANOM-05",
                "name": "Dengula Ridge Fault Contact",
                "lat": round(clat - 0.012, 5),
                "lon": round(clon + 0.015, 5),
                "confidence": 83.5,
                "signature": "High Iron-Manganese Ratio with Thermal Elevation",
                "estimated_grade": "36.8% Mn (Ferro-Manganese Ore)",
                "status": "Surface Trenches Active"
            }
        ]
    elif mine_id == "nishikhal_rayagada":
        lineaments = [
            {
                "name": "Eastern Ghats Foliation Plane Thrust",
                "type": "Regional Ductile Thrust",
                "strike": "NE-SW (N45°E)",
                "coordinates": [
                    [clat - 0.030, clon - 0.025],
                    [clat - 0.010, clon - 0.008],
                    [clat + 0.012, clon + 0.012],
                    [clat + 0.032, clon + 0.030]
                ]
            },
            {
                "name": "Nagavali Fracture Corridor",
                "type": "Transcurrent Fault",
                "strike": "NNW-SSE (N25°W)",
                "coordinates": [
                    [clat + 0.026, clon - 0.018],
                    [clat + 0.004, clon - 0.004],
                    [clat - 0.020, clon + 0.012]
                ]
            }
        ]
        anomalies = [
            {
                "id": "OD-ANOM-06",
                "name": "Podagada Ridge Manganese Shoot",
                "lat": round(clat + 0.010, 5),
                "lon": round(clon + 0.011, 5),
                "confidence": 95.2,
                "signature": "High Braunite SWIR Absorption, Sharp Thermal Gradient",
                "estimated_grade": "47.5% Mn (Low Phosphorus <0.08% P)",
                "status": "Adit Underground Exploration In Progress"
            },
            {
                "id": "OD-ANOM-07",
                "name": "Devajolla Khondalite Contact Gossan",
                "lat": round(clat - 0.015, 5),
                "lon": round(clon - 0.012, 5),
                "confidence": 86.4,
                "signature": "Strong Pyrolusite Band Ratio & Canopy Chlorophyll Stress",
                "estimated_grade": "43.1% Mn (High Metallurgical Grade)",
                "status": "Core Assay Verification Completed"
            }
        ]
    else:
        # Default Central India Sausar Belt Lineaments & Anomalies
        lineaments = [
            {
                "name": "Central Sausar Syncline Axis",
                "type": "Fold Axis (F2)",
                "strike": "ENE-WSW (N65°E)",
                "coordinates": [
                    [clat - 0.025, clon - 0.035],
                    [clat - 0.010, clon - 0.012],
                    [clat + 0.005, clon + 0.010],
                    [clat + 0.022, clon + 0.038]
                ]
            },
            {
                "name": "Bharweli-Balaghat Shear Fault",
                "type": "Major Thrust Fault",
                "strike": "Steep 70° SE Dip",
                "coordinates": [
                    [clat - 0.030, clon - 0.018],
                    [clat - 0.008, clon - 0.002],
                    [clat + 0.015, clon + 0.022],
                    [clat + 0.032, clon + 0.045]
                ]
            },
            {
                "name": "Cross-Cutting Fracture Zone F-4",
                "type": "Transverse Fault (High Water Inflow Risk)",
                "strike": "NW-SE (N35°W)",
                "coordinates": [
                    [clat + 0.025, clon - 0.020],
                    [clat + 0.005, clon - 0.002],
                    [clat - 0.018, clon + 0.015]
                ]
            }
        ]
        anomalies = [
            {
                "id": "ANOM-01",
                "name": "Deep Eastern Extension Target",
                "lat": round(clat + 0.008, 5),
                "lon": round(clon + 0.012, 5),
                "confidence": 92.4,
                "signature": "High MOSI (0.88), Elevated LST (+4.2°C), Low NDVI (0.19)",
                "estimated_grade": "45.2% Mn (High Grade Braunite)",
                "status": "Recommended for Exploratory Core Drilling"
            },
            {
                "id": "ANOM-02",
                "name": "North Synclinal Limb Gossan",
                "lat": round(clat + 0.016, 5),
                "lon": round(clon + 0.024, 5),
                "confidence": 84.1,
                "signature": "High Ferrous-Mn ratio, Moderate Thermal Anomaly",
                "estimated_grade": "38.6% Mn (Ferro-Manganese Grade)",
                "status": "Geophysical Resistivity Survey Queued"
            },
            {
                "id": "ANOM-03",
                "name": "South Footwall Sub-surface Horizon",
                "lat": round(clat - 0.012, 5),
                "lon": round(clon - 0.015, 5),
                "confidence": 78.5,
                "signature": "Vegetation Chlorophyll Depletion & High SWIR",
                "estimated_grade": "35.0% Mn (Silico-Manganese Grade)",
                "status": "Surface Trench Sampling Completed"
            }
        ]

    return {
        "mine": mine,
        "grid_step_deg": step,
        "points": points,
        "lineaments": lineaments,
        "anomalies": anomalies
    }

def generate_boreholes(mine_id="balaghat"):
    """
    Generates realistic core drilling borehole logs across the deposit strike
    with collar coordinates, true depth, and assayed intervals (%Mn, %Fe, %SiO2, %P).
    """
    mine = MOIL_MINES.get(mine_id, MOIL_MINES["balaghat"])
    clat, clon = mine["lat"], mine["lon"]

    boreholes = []
    # 16 boreholes arranged across 4 exploration fences (sections)
    fences = ["Section 0+00", "Section 1+50E", "Section 3+00E", "Section 4+50E"]
    depths = [180, 240, 310, 385, 420, 260, 350, 480, 210, 290, 360, 450, 190, 275, 390, 510]

    for idx in range(16):
        fence_idx = idx % 4
        dist_along = (fence_idx - 1.5) * 0.008
        dist_across = ((idx // 4) - 1.5) * 0.006

        lat = clat + dist_along * 0.8 + dist_across * 0.4
        lon = clon + dist_along * 0.4 - dist_across * 0.8
        total_depth = depths[idx]

        # Ore intersection typically occurs at depths 60m to 250m depending on dip
        ore_start = 75 + (idx * 17) % 180
        ore_thickness = 12.5 + (idx * 3.7) % 22.0

        # Grades in ore zone
        mn_grade = round(37.5 + (idx * 4.3) % 12.0, 2)
        fe_grade = round(4.2 + (idx * 1.1) % 5.0, 2)
        sio2_grade = round(7.0 + (idx * 2.3) % 11.0, 2)
        p_grade = round(0.08 + (idx * 0.03) % 0.14, 3) # Phosphorus penalty threshold is 0.15%

        boreholes.append({
            "id": f"BH-MOIL-{idx+101}",
            "fence": fences[fence_idx],
            "lat": round(lat, 5),
            "lon": round(lon, 5),
            "collar_elevation_m": round(mine["elevation"] + (idx % 5) * 3.5, 1),
            "total_depth_m": total_depth,
            "azimuth": 335, # perpendicular to strike
            "dip": -70, # inclined exploration holes
            "ore_from_m": round(ore_start, 1),
            "ore_to_m": round(ore_start + ore_thickness, 1),
            "ore_thickness_m": round(ore_thickness, 1),
            "assays": {
                "mn_pct": mn_grade,
                "fe_pct": fe_grade,
                "sio2_pct": sio2_grade,
                "p_pct": p_grade,
                "density_t_m3": round(3.85 + (mn_grade - 35) * 0.035, 2)
            },
            "lithology": [
                {"from": 0, "to": 22, "rock": "Alluvium / Lateritic Soil", "grade": 12.0},
                {"from": 22, "to": ore_start, "rock": "Quartz-Muscovite Schist (Hanging Wall)", "grade": 6.5},
                {"from": ore_start, "to": round(ore_start + ore_thickness, 1), "rock": "Braunite / Pyrolusite Ore Body", "grade": mn_grade},
                {"from": round(ore_start + ore_thickness, 1), "to": total_depth, "rock": "Tirodi Gneiss / Gondite (Footwall)", "grade": 15.2}
            ]
        })

    return boreholes

def generate_3d_voxels(mine_id="balaghat", cutoff_grade=35.0):
    """
    Generates a 3D block model of the orebody and excavation pit.
    Coordinates are localized in meters (X: Strike, Y: Cross-strike, Z: Depth below surface).
    Computes reserve tonnage, average grade, and UNFC classifications.
    """
    # Grid dimensions in blocks
    nx, ny, nz = 16, 12, 10
    dx, dy, dz = 25, 20, 15 # block size in meters
    dip_angle = 68.0 # degrees dip to South-East
    dip_rad = math.radians(dip_angle)

    voxels = []
    total_ore_tonnes = 0.0
    weighted_mn_sum = 0.0
    weighted_p_sum = 0.0

    unfc_counts = {"111_Proved": 0, "122_Probable": 0, "333_Inferred": 0}

    for iz in range(nz):
        z = -(iz * dz + 10) # depth (negative downwards, from -10m to -160m)
        center_y_at_depth = abs(z) / math.tan(dip_rad) # shifting with dip

        for ix in range(nx):
            x = (ix - nx/2) * dx # along strike (-200m to +200m)
            for iy in range(ny):
                y = (iy - ny/2) * dy # cross strike (-120m to +120m)

                # Distance from dipping central ore tabular vein
                dist_to_vein = abs(y - (center_y_at_depth - 20) + 0.15 * x)

                # Synthetic kriged grade interpolation
                if dist_to_vein < 18:
                    # Inside ore zone
                    base_mn = 47.0 - (dist_to_vein / 18.0) * 16.0
                    # Grade variation with depth and strike
                    local_factor = 1.5 * math.sin(x * 0.02) + 1.2 * math.cos(abs(z) * 0.03)
                    mn_grade = float(np.clip(base_mn + local_factor, 28.0, 52.0))
                    density = 3.6 + (mn_grade - 28.0) * 0.028 # tonnes per m3
                    block_volume = dx * dy * dz # 7,500 m3
                    block_tonnes = block_volume * density

                    # UNFC Reserve categorization based on depth / exploration density
                    if abs(z) < 80:
                        unfc = "111_Proved"
                        confidence = "High (Core drilled & assayed)"
                    elif abs(z) < 135:
                        unfc = "122_Probable"
                        confidence = "Medium (Drill fence indicated)"
                    else:
                        unfc = "333_Inferred"
                        confidence = "Inferred from Satellite & Geophysics"

                    # Check against user cutoff grade
                    is_ore = mn_grade >= cutoff_grade

                    if is_ore:
                        total_ore_tonnes += block_tonnes
                        weighted_mn_sum += mn_grade * block_tonnes
                        weighted_p_sum += (0.09 + 0.0015 * abs(x % 20)) * block_tonnes
                        unfc_counts[unfc] += block_tonnes

                    # Assign category
                    if mn_grade >= 44.0:
                        grade_category = "High Grade (>44% Mn)"
                        color = "#a855f7" # Vibrant purple
                    elif mn_grade >= 38.0:
                        grade_category = "Medium / Ferro Grade (38-44% Mn)"
                        color = "#06b6d4" # Cyan
                    elif mn_grade >= 35.0:
                        grade_category = "Silico-Manganese Grade (35-38% Mn)"
                        color = "#3b82f6" # Blue
                    else:
                        grade_category = "Low Grade / Marginal (<35% Mn)"
                        color = "#64748b" # Slate

                    voxels.append({
                        "x": x,
                        "y": y,
                        "z": z,
                        "mn": round(mn_grade, 1),
                        "density": round(density, 2),
                        "tonnes": round(block_tonnes, 0),
                        "unfc": unfc,
                        "confidence": confidence,
                        "category": grade_category,
                        "color": color,
                        "is_ore": is_ore
                    })

    avg_mn = round(weighted_mn_sum / total_ore_tonnes, 2) if total_ore_tonnes > 0 else 0
    avg_p = round(weighted_p_sum / total_ore_tonnes, 4) if total_ore_tonnes > 0 else 0

    return {
        "mine_id": mine_id,
        "cutoff_grade": cutoff_grade,
        "total_reserve_tonnes": round(total_ore_tonnes, 0),
        "avg_mn_pct": avg_mn,
        "avg_p_pct": avg_p,
        "unfc_summary": {
            "proved_111_mt": round(unfc_counts["111_Proved"] / 1_000_000, 3),
            "probable_122_mt": round(unfc_counts["122_Probable"] / 1_000_000, 3),
            "inferred_333_mt": round(unfc_counts["333_Inferred"] / 1_000_000, 3)
        },
        "voxels": voxels
    }

def generate_production_and_shortfall(mine_id="balaghat"):
    """
    Generates historical 30-day production trends, current operational constraints,
    equipment health telemetry, and 14-day AI forecast with shortfall risks.
    """
    mine = MOIL_MINES.get(mine_id, MOIL_MINES["balaghat"])
    daily_target = mine["daily_target_tonnes"]

    # 30-day historical production records
    history = []
    np.random.seed(42)
    base_prod = daily_target * 0.94

    for day in range(30, 0, -1):
        # Introduce occasional weather and breakdown dips
        rainfall_mm = 0.0
        if day in [5, 6, 12, 13, 14, 22]:
            rainfall_mm = float(np.random.uniform(35.0, 85.0))

        equipment_avail = 92.0 - (15.0 if rainfall_mm > 40 else 0.0) - float(np.random.uniform(0, 8))
        actual = base_prod * (equipment_avail / 100.0) + float(np.random.uniform(-50, 40))
        actual = max(350, round(actual, 0))

        history.append({
            "day": f"D-{day}",
            "target": daily_target,
            "actual": actual,
            "variance": round(actual - daily_target, 0),
            "rainfall_mm": round(rainfall_mm, 1),
            "equip_avail_pct": round(equipment_avail, 1)
        })

    # Future 14-day predictive forecast with AI Shortfall Risk
    forecast = []
    for day in range(1, 15):
        # Forecasted monsoon spike around day 3-5
        pred_rain = 0.0
        if day in [3, 4, 5]:
            pred_rain = float(np.random.uniform(45.0, 95.0))
        elif day in [8, 9]:
            pred_rain = float(np.random.uniform(20.0, 40.0))

        # Expected equipment downtime risk
        shovel_risk = 0.25 if day in [3, 4, 5, 11] else 0.08
        blasting_delay_prob = 0.40 if pred_rain > 30 else 0.05

        # Predicted production
        expected_prod = daily_target * (1.0 - (0.28 if pred_rain > 50 else (0.12 if pred_rain > 20 else 0.02)))
        expected_prod -= (shovel_risk * 280.0) + (blasting_delay_prob * 150.0)
        expected_prod = round(expected_prod, 0)

        shortfall = max(0, daily_target - expected_prod)
        risk_level = "CRITICAL" if shortfall > daily_target * 0.3 else ("WARNING" if shortfall > daily_target * 0.12 else "NORMAL")

        forecast.append({
            "day": f"Day +{day}",
            "target": daily_target,
            "predicted": expected_prod,
            "confidence_lower": round(expected_prod * 0.88, 0),
            "confidence_upper": round(expected_prod * 1.06, 0),
            "shortfall": round(shortfall, 0),
            "risk_level": risk_level,
            "rainfall_forecast_mm": round(pred_rain, 1),
            "key_constraint": "Monsoon Sump Flooding & Road Slippage" if pred_rain > 40 else ("Shovel MTBF Breakdown" if shovel_risk > 0.2 else "Normal Operations")
        })

    # Live Equipment Fleet Telemetry
    equipment_fleet = [
        {"id": "EXC-101", "name": "P&H 1900AL Electric Shovel #1", "bench": "Bench 04 (High Grade 46% Mn)", "status": "OPERATIONAL", "health": 94, "mtbf_hrs": 380, "throughput_tph": 320},
        {"id": "EXC-102", "name": "Komatsu PC1250 Hydraulic Excavator", "bench": "Bench 02 (Ferro Grade 41% Mn)", "status": "WARNING (Hydraulic Overheat)", "health": 68, "mtbf_hrs": 110, "throughput_tph": 210},
        {"id": "EXC-103", "name": "Tata Hitachi EX800 Excavator", "bench": "Bench 06 (Waste Stripping)", "status": "OPERATIONAL", "health": 88, "mtbf_hrs": 420, "throughput_tph": 240},
        {"id": "DMP-201..208", "name": "BEML 60T Dumpers (Batch A - 8 Units)", "bench": "Pit Haul Road South", "status": "OPERATIONAL", "health": 91, "speed_avg_kmh": 19.5, "cycle_time_min": 18.2},
        {"id": "DMP-209..214", "name": "BEML 60T Dumpers (Batch B - 6 Units)", "bench": "Pit Haul Road North", "status": "DEGRADED (Wet Road Slippage)", "health": 74, "speed_avg_kmh": 12.0, "cycle_time_min": 26.8},
        {"id": "DRL-301", "name": "Sandvik D245S Rotary Blast Drill", "bench": "Bench 05 Pattern A", "status": "STANDBY (Pending Explosive ANFO)", "health": 95, "meters_drilled": 280, "readiness": "Ready for Blast"},
        {"id": "SHF-401", "name": "Balaghat Main Vertical Hoisting Shaft", "bench": "Level -240m Underground", "status": "OPERATIONAL", "health": 96, "skip_capacity_t": 12.0, "cycles_per_hr": 22}
    ]

    # Weather & Environmental Sensors
    environmental_telemetry = {
        "current_rainfall_rate_mm_hr": 3.2,
        "pit_sump_water_level_m": 4.8,
        "pit_sump_critical_threshold_m": 6.0,
        "dewatering_pumps_active": 4,
        "dewatering_pumps_capacity_m3_hr": 1600,
        "haul_road_friction_index": 0.62, # safe is > 0.65
        "wet_bulb_temperature_c": 29.4,
        "blasting_seismic_ppv_mm_s": 2.1 # statutory limit 5.0 mm/s near structures
    }

    return {
        "mine": mine,
        "history": history,
        "forecast": forecast,
        "equipment_fleet": equipment_fleet,
        "environmental_telemetry": environmental_telemetry,
        "shortfall_summary": {
            "projected_14day_loss_tonnes": sum(f["shortfall"] for f in forecast),
            "primary_driver": "Heavy precipitation inundating Bench 02 and slow dumper cycle times",
            "dispatch_impact": "Potential 3-day supply gap for Bhilai Steel Plant (SAIL) if unmitigated"
        }
    }

def solve_prescriptive_optimization(weather_severity=1.0, shovel_downtime=0, blasting_delay_days=0, target_tonnes=1450, target_mn_grade=42.5):
    """
    Prescriptive Decision Support & Stockpile Blending Optimizer.
    Solves optimal fleet rerouting, blast rescheduling, and linear programming stockpile blending
    to bridge the production shortfall.
    """
    # Baseline expected production shortfall
    base_deficit = (weather_severity * 280) + (shovel_downtime * 210) + (blasting_delay_days * 160)
    base_prod = max(400, target_tonnes - base_deficit)

    # Stockpiles available for blending
    stockpiles = [
        {"id": "SP-HG", "name": "High Grade Stockpile (Dioxide/Pyrolusite)", "mn": 47.8, "fe": 3.8, "p": 0.08, "cost_per_t": 14200, "avail_tonnes": 4800},
        {"id": "SP-FG", "name": "Ferro Grade Stockpile (Braunite Run-of-Mine)", "mn": 41.5, "fe": 5.4, "p": 0.11, "cost_per_t": 11800, "avail_tonnes": 8200},
        {"id": "SP-SM", "name": "Silico-Manganese Grade Stockpile", "mn": 35.2, "fe": 6.8, "p": 0.14, "cost_per_t": 8900, "avail_tonnes": 11500},
        {"id": "SP-LG", "name": "Sub-grade Low Mn Stockpile (Upgradable)", "mn": 29.5, "fe": 8.1, "p": 0.17, "cost_per_t": 5400, "avail_tonnes": 14000}
    ]

    # Solve optimal blend weights using convex combination to reach target_mn_grade
    # Target: w_HG*47.8 + w_FG*41.5 + w_SM*35.2 + w_LG*29.5 == target_mn_grade
    # Simple linear interpolation between highest and lowest available grades
    gap = target_mn_grade - 29.5
    spread = 47.8 - 29.5
    w_hg = float(np.clip(gap / spread * 0.75, 0.15, 0.65))
    w_fg = float(np.clip(0.35, 0.15, 0.45))
    remaining = 1.0 - (w_hg + w_fg)
    w_sm = float(remaining * 0.7)
    w_lg = float(remaining * 0.3)

    # Normalize
    total_w = w_hg + w_fg + w_sm + w_lg
    w_hg, w_fg, w_sm, w_lg = w_hg/total_w, w_fg/total_w, w_sm/total_w, w_lg/total_w

    blended_mn = round(w_hg*47.8 + w_fg*41.5 + w_sm*35.2 + w_lg*29.5, 2)
    blended_fe = round(w_hg*3.8 + w_fg*5.4 + w_sm*6.8 + w_lg*8.1, 2)
    blended_p = round(w_hg*0.08 + w_fg*0.11 + w_sm*0.14 + w_lg*0.17, 3)

    # Prescriptive Action Protocol
    actions = []

    if weather_severity > 1.2:
        actions.append({
            "priority": "HIGH",
            "category": "Weather Mitigation & Drainage",
            "action": "Activate Auxiliary Dewatering Pumps (Pump Station #3)",
            "impact": "Lowers pit sump rise rate by 420 m³/hr; prevents flooding of High-Grade Bench 04.",
            "tonnes_recovered": 180,
            "status": "Ready to Trigger"
        })
        actions.append({
            "priority": "HIGH",
            "category": "Haulage Optimization",
            "action": "Reroute 60T Dumpers (Batch B) to South Weather-Graded Hardstand Road",
            "impact": "Decreases round-trip cycle time from 26.8 min to 19.2 min; restores 15% fleet throughput.",
            "tonnes_recovered": 140,
            "status": "Ready to Trigger"
        })

    if shovel_downtime > 0:
        actions.append({
            "priority": "CRITICAL",
            "category": "Equipment Dynamic Redeployment",
            "action": f"Reallocate 4 Dumpers from idle excavator to P&H 1900AL Shovel #1 at Bench 04",
            "impact": "Boosts shovel utilization to 98% and increases high-grade extraction rate.",
            "tonnes_recovered": 210,
            "status": "Ready to Trigger"
        })

    if blasting_delay_days > 0:
        actions.append({
            "priority": "MEDIUM",
            "category": "Blasting & Explosive Logistics",
            "action": "Execute Pre-Split Controlled Blast 18h ahead of incoming precipitation front",
            "impact": "Prevents wall-slumping dilution and creates 12,000 tonnes muckpile buffer.",
            "tonnes_recovered": 160,
            "status": "Scheduled"
        })

    # Stockpile Blending action
    actions.append({
        "priority": "HIGH",
        "category": "Smart Ore Blending Protocol",
        "action": f"Release Stockpile Blend: {int(w_hg*100)}% HG + {int(w_fg*100)}% FG + {int(w_sm*100)}% SM to maintain plant feed",
        "impact": f"Delivers {blended_mn}% Mn and {blended_p}% P, meeting customer spec (SAIL Contract #8491) without penalties.",
        "tonnes_recovered": int(base_deficit * 0.85),
        "status": "Optimized"
    })

    total_recovered = sum(a["tonnes_recovered"] for a in actions)
    mitigated_prod = min(target_tonnes, base_prod + total_recovered)
    recovery_rate = round((mitigated_prod / target_tonnes) * 100, 1)

    return {
        "parameters": {
            "weather_severity": weather_severity,
            "shovel_downtime": shovel_downtime,
            "blasting_delay_days": blasting_delay_days,
            "target_tonnes": target_tonnes,
            "target_mn_grade": target_mn_grade
        },
        "base_unmitigated_production": round(base_prod, 0),
        "unmitigated_deficit": round(base_deficit, 0),
        "mitigated_production": round(mitigated_prod, 0),
        "recovery_rate_pct": recovery_rate,
        "residual_shortfall": round(max(0, target_tonnes - mitigated_prod), 0),
        "stockpile_blend": {
            "high_grade_pct": round(w_hg * 100, 1),
            "ferro_grade_pct": round(w_fg * 100, 1),
            "silico_mn_pct": round(w_sm * 100, 1),
            "low_grade_pct": round(w_lg * 100, 1),
            "result_mn_pct": blended_mn,
            "result_fe_pct": blended_fe,
            "result_p_pct": blended_p,
            "cost_per_tonne_inr": round(w_hg*14200 + w_fg*11800 + w_sm*8900 + w_lg*5400, 0)
        },
        "prescriptive_actions": actions
    }
