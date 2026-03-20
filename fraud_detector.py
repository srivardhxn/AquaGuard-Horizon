import sys

def detect_spoofing(lux_level, rainfall_mm):
    # Requirement: Identify fake claims using sensor fusion
    if float(lux_level) > 500 and float(rainfall_mm) > 15:
        return " FRAUD DETECTED: Bright sunlight detected during reported storm."
    return " VERIFIED: Environmental conditions match the claim."

if __name__ == "__main__":
    # Simulate receiving data from the worker's phone
    print(detect_spoofing(lux_level=600, rainfall_mm=20))