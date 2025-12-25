#!/usr/bin/env python3
"""
Script to create the analytics database in ClickHouse
"""
from clickhouse_driver import Client

# ClickHouse connection details
host = "139.144.16.45"
port = 9000
user = "default"
password = "Texaco2671!"
database = "analytics"

def create_database():
    # Connect to default database first
    client = Client(host=host, port=port, user=user, password=password, database='default')

    try:
        # Check if database exists
        result = client.execute("SHOW DATABASES LIKE 'analytics'")
        if result:
            print("Database 'analytics' already exists")
        else:
            # Create the database
            client.execute("CREATE DATABASE IF NOT EXISTS analytics")
            print("Database 'analytics' created successfully")

        # Test connection to the analytics database
        client.database = 'analytics'
        result = client.execute("SELECT version()")
        print(f"Connected to ClickHouse version: {result[0][0]}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        client.disconnect()

if __name__ == "__main__":
    create_database()
