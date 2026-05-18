## FleetFlow ERD (Mermaid)

The entity-relationship diagram below describes the core relational models for FleetFlow.

```mermaid
erDiagram
    USERS {
        uuid id PK
        string email
        string password_hash
        string role
        string name
        string phone
        bool is_verified
        datetime created_at
        datetime updated_at
    }

    COMPANIES {
        uuid id PK
        uuid owner_user_id FK
        string name
        string address
        string gst_vat_id
    }

    DRIVER_PROFILE {
        uuid id PK
        uuid user_id FK
        string license_number
        date license_expiry
        int experience_years
    }

    TRUCK {
        uuid id PK
        uuid company_id FK
        string registration_number
        string type
        float capacity_tons
        string status
        uuid assigned_driver_id FK
    }

    LOAD {
        uuid id PK
        uuid shipper_id FK
        string title
        string goods_type
        float weight_tons
        string pickup_location
        string delivery_location
        datetime pickup_window_start
        datetime pickup_window_end
        string status
        uuid assigned_truck_id FK
        uuid assigned_driver_id FK
    }

    BID {
        uuid id PK
        uuid load_id FK
        uuid bidder_id FK
        float proposed_price
        string status
        datetime created_at
    }

    TRIP {
        uuid id PK
        uuid load_id FK
        uuid truck_id FK
        uuid driver_id FK
        datetime start_time
        datetime pickup_time
        datetime delivery_time
        string status
    }

    PAYMENT {
        uuid id PK
        uuid load_id FK
        uuid payer_id FK
        uuid payee_id FK
        float amount
        string status
        datetime created_at
    }

    DOCUMENT {
        uuid id PK
        string owner_type
        uuid owner_id FK
        string doc_type
        string file_ref
        bool verified
        date expiry_date
    }

    USERS ||--o{ COMPANIES : "owns"
    COMPANIES ||--o{ TRUCK : "has"
    USERS ||--o{ DRIVER_PROFILE : "profile"
    USERS ||--o{ LOAD : "posts"
    LOAD ||--o{ BID : "receives"
    LOAD ||--o{ TRIP : "generates"
    TRUCK ||--o{ TRIP : "performs"
    USERS ||--o{ DOCUMENT : "uploads"
    LOAD ||--o{ PAYMENT : "billed"
    USERS ||--o{ PAYMENT : "pays/receives"

```

File: ERD.md — rendered with Mermaid; use a Mermaid viewer or the included preview.
