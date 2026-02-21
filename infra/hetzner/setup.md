# Hetzner Cloud Setup for OpenClaw Platform

## Architecture
- **K3s cluster** on Hetzner Cloud VPS instances (lightweight Kubernetes)
- **Control plane**: 1x CX32 (4 vCPU, 8GB RAM) — ~$7.50/mo
- **Worker nodes**: 2-4x CX22 (2 vCPU, 4GB RAM) — ~$4.50/mo each
- **Total base cost**: ~$16-25/mo for a small cluster

## Prerequisites
1. Create a Hetzner Cloud account at https://console.hetzner.cloud
2. Install `hcloud` CLI: `brew install hcloud`
3. Create an API token in the Hetzner Cloud Console

## Step 1: Configure hcloud CLI
```bash
hcloud context create openclaw-platform
# Enter your API token when prompted
```

## Step 2: Create the control plane server
```bash
hcloud server create \
  --name k3s-control \
  --type cx32 \
  --image ubuntu-24.04 \
  --location fsn1 \
  --ssh-key your-ssh-key-name
```

## Step 3: Install K3s on the control plane
```bash
ssh root@<control-plane-ip>
curl -sfL https://get.k3s.io | sh -
# Get the join token for workers
cat /var/lib/rancher/k3s/server/node-token
```

## Step 4: Create worker nodes
```bash
hcloud server create \
  --name k3s-worker-1 \
  --type cx22 \
  --image ubuntu-24.04 \
  --location fsn1 \
  --ssh-key your-ssh-key-name

hcloud server create \
  --name k3s-worker-2 \
  --type cx22 \
  --image ubuntu-24.04 \
  --location fsn1 \
  --ssh-key your-ssh-key-name
```

## Step 5: Join workers to the cluster
```bash
ssh root@<worker-ip>
curl -sfL https://get.k3s.io | K3S_URL=https://<control-plane-ip>:6443 K3S_TOKEN=<node-token> sh -
```

## Step 6: Get kubeconfig
```bash
scp root@<control-plane-ip>:/etc/rancher/k3s/k3s.yaml ~/.kube/config
# Update the server address in the config to use the public IP
sed -i '' "s/127.0.0.1/<control-plane-ip>/g" ~/.kube/config
```

## Step 7: Install OpenClaw K8s Operator
```bash
helm install openclaw-operator \
  oci://ghcr.io/openclaw-rocks/charts/openclaw-operator \
  --namespace openclaw-operator-system \
  --create-namespace
```

## Step 8: Install Hetzner Cloud Controller Manager (for LoadBalancer support)
```bash
kubectl -n kube-system create secret generic hcloud \
  --from-literal=token=<your-hetzner-api-token>

kubectl apply -f https://github.com/hetznercloud/hcloud-cloud-controller-manager/releases/latest/download/ccm.yaml
```

## Scaling
- Add more worker nodes as user count grows
- Each OpenClaw instance needs ~512MB-1GB RAM
- A CX22 worker (4GB) can host ~3-4 user instances
- With hibernation, effective density is much higher

## Cost Estimation
| Users | Workers Needed | Monthly Cost |
|-------|---------------|-------------|
| 1-10  | 2x CX22      | ~$16.50     |
| 10-30 | 4x CX22      | ~$25.50     |
| 30-50 | 6x CX22      | ~$34.50     |
| 50+   | Scale with CX32s | $50+    |

*With hibernation (70% saving), these numbers support 3-4x more users*
