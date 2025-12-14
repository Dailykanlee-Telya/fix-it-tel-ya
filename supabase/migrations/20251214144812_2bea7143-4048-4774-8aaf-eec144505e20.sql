-- Add new status values for return shipments
ALTER TYPE b2b_shipment_status ADD VALUE 'RETOUR_ANGELEGT';
ALTER TYPE b2b_shipment_status ADD VALUE 'RETOUR_UNTERWEGS';
ALTER TYPE b2b_shipment_status ADD VALUE 'RETOUR_ZUGESTELLT';

-- Add shipment type column to distinguish inbound vs outbound
ALTER TABLE b2b_shipments ADD COLUMN shipment_type TEXT NOT NULL DEFAULT 'INBOUND' 
  CHECK (shipment_type IN ('INBOUND', 'OUTBOUND'));

-- Add recipient_address for return shipments (partner address)
ALTER TABLE b2b_shipments ADD COLUMN recipient_address JSONB;

-- Create index for efficient filtering
CREATE INDEX idx_b2b_shipments_type ON b2b_shipments(shipment_type);
CREATE INDEX idx_b2b_shipments_status ON b2b_shipments(status);