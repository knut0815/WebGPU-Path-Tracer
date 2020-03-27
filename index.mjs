import WebGPU from "webgpu";

import fs from "fs";
import tolw from "tolw";
import glMatrix from "gl-matrix";

import {
  keyCodeToChar,
  loadShaderFile,
  readImageFile,
  readBinaryFile
} from "./utils.mjs"

import Camera from "./Camera.mjs";
import LightBuffer from "./LightBuffer.mjs";
import GeometryBuffer from "./GeometryBuffer.mjs";
import InstanceBuffer from "./InstanceBuffer.mjs";
import TextureArrayBuffer from "./TextureArrayBuffer.mjs";

Object.assign(global, WebGPU);
Object.assign(global, glMatrix);

(async function main() {

  await tolw.init();

  let window = new WebGPUWindow({
    width: 1280,
    height: 768,
    title: "WebGPU RT",
    resizable: false
  });
  global["window"] = window;

  let adapter = await GPU.requestAdapter({
    window,
    preferredBackend: "Vulkan"
  });

  let device = await adapter.requestDevice();

  let camera = new Camera({ device });
  global["camera"] = camera;

  let queue = device.getQueue();

  let context = window.getContext("webgpu");

  let swapChainFormat = await context.getSwapChainPreferredFormat(device);

  let swapChain = context.configureSwapChain({
    device: device,
    format: swapChainFormat
  });

  let images = [
    readImageFile(`assets/textures/Facade/facade_col.png`),
    readImageFile(`assets/textures/Facade/facade_normal.png`),
    readImageFile(`assets/textures/Facade/facade_metal_roughness.png`),
    readImageFile(`assets/textures/Facade/facade_emissive.png`),
    readImageFile(`assets/textures/Fabric19/Fabric19_col.jpg`),
    readImageFile(`assets/textures/Fabric19/Fabric19_nrm.jpg`),
    readImageFile(`assets/textures/Fabric19/Fabric19_met_rgh.jpg`)
  ];

  let geometries = [
    tolw.loadObj(readBinaryFile(`assets/models/plane.obj`)),
    tolw.loadObj(readBinaryFile(`assets/models/sphere.obj`)),
    tolw.loadObj(readBinaryFile(`assets/models/meetmat/body.obj`)),
    tolw.loadObj(readBinaryFile(`assets/models/meetmat/head.obj`)),
    tolw.loadObj(readBinaryFile(`assets/models/box.obj`)),
  ];

  let geometryBuffer = new GeometryBuffer({ device, geometries });

  let faceBuffer = geometryBuffer.getFaceBuffer();
  let attributeBuffer = geometryBuffer.getAttributeBuffer();
  let bottomContainers = geometryBuffer.getBottomLevelContainers();

  let materials = [
    {
      color: [0, 0, 0],
      metalness: 0.001,
      roughness: 0.068,
      specular: 0.0117,
      albedo: images[4],
      normal: images[5],
      metalRoughness: images[6],
      textureScaling: 5.5,
    },
    {
      color: [0, 0, 0],
      metalness: 0.5,
      roughness: -0.1634,
      specular: 0.95,
      albedo: images[0],
      normal: images[1],
      metalRoughness: images[2],
      emission: images[3],
      emissionIntensity: 8.0,
    },
    {
      color: [0, 0, 0],
      metalness: 0.5,
      roughness: -0.1634,
      specular: 0.95,
      albedo: images[0],
      normal: images[1],
      metalRoughness: images[2],
      emission: images[3],
      emissionIntensity: 3.0,
    },
    {
      color: [22100, 22500, 22000],
    },
    {
      color: [46000, 49000, 43000],
    }
  ];

  let instances = [
    // body
    {
      material: materials[1],
      geometry: bottomContainers[2],
      transform: {
        translation: { x: -32, y: 0, z: 128 },
        rotation: { x: 0, y: -80, z: 0 },
        scale: { x: 512, y: 512, z: 512 }
      }
    },
    // head
    {
      material: materials[2],
      geometry: bottomContainers[3],
      transform: {
        translation: { x: -32, y: 0, z: 128 },
        rotation: { x: 0, y: -80, z: 0 },
        scale: { x: 512, y: 512, z: 512 }
      }
    },
    // body
    {
      material: materials[1],
      geometry: bottomContainers[2],
      transform: {
        translation: { x: 64, y: 0, z: 128 },
        rotation: { x: 0, y: 180, z: 0 },
        scale: { x: 512, y: 512, z: 512 }
      }
    },
    // head
    {
      material: materials[2],
      geometry: bottomContainers[3],
      transform: {
        translation: { x: 64, y: 0, z: 128 },
        rotation: { x: 0, y: 180, z: 0 },
        scale: { x: 512, y: 512, z: 512 }
      }
    },
    // body
    {
      material: materials[1],
      geometry: bottomContainers[2],
      transform: {
        translation: { x: 32, y: 0, z: 256 - 32 },
        rotation: { x: 0, y: 180 + 70, z: 0 },
        scale: { x: 512, y: 512, z: 512 }
      }
    },
    // head
    {
      material: materials[2],
      geometry: bottomContainers[3],
      transform: {
        translation: { x: 32, y: 0, z: 256 - 32 },
        rotation: { x: 0, y: 180 + 70, z: 0 },
        scale: { x: 512, y: 512, z: 512 }
      }
    },
    // floor
    {
      material: materials[0],
      geometry: bottomContainers[4],
      transform: {
        translation: { x: 0, y: 384, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 384, y: 384, z: 384 }
      }
    },
    // light plane
    {
      material: materials[3],
      geometry: bottomContainers[0],
      transform: {
        translation: { x: 0, y: 768 - 1, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 32, y: 32, z: 32 }
      }
    },
    // light plane
    {
      material: materials[4],
      geometry: bottomContainers[0],
      transform: {
        translation: { x: 0, y: 128, z: 256 + 48 },
        rotation: { x: 116, y: 0, z: 0 },
        scale: { x: 32, y: 8, z: 8 }
      }
    }
  ];

  let lights = [
    {
      instance: instances[instances.length - 2]
    },
    {
      instance: instances[instances.length - 1]
    }
  ];

  let instanceBuffer = new InstanceBuffer({ device, instances, materials, images, geometryBuffer });
  instanceBuffer.build();

  let materialBuffer = instanceBuffer.getMaterialBuffer();
  let instancesBuffer = instanceBuffer.getInstanceBuffer();
  let instanceContainer = instanceBuffer.getTopLevelContainer();

  let textureArray = new TextureArrayBuffer({ device, images });
  let textureView = textureArray.getTextureView();
  let textureSampler = textureArray.getTextureSampler();

  let lightBuffer = new LightBuffer({ device, instances, lights });
  let lightsBuffer = lightBuffer.getLightBuffer();

  let sampleCount = 8;
  let totalSampleCount = sampleCount;

  let pixelBufferByteLength = window.width * window.height * 4 * Float32Array.BYTES_PER_ELEMENT;
  let pixelBuffer = device.createBuffer({ usage: GPUBufferUsage.STORAGE, size: pixelBufferByteLength });
  pixelBuffer.byteLength = pixelBufferByteLength;

  let accumulationBufferByteLength = window.width * window.height * 4 * Float32Array.BYTES_PER_ELEMENT;
  let accumulationBuffer = device.createBuffer({ usage: GPUBufferUsage.STORAGE, size: accumulationBufferByteLength });
  accumulationBuffer.byteLength = accumulationBufferByteLength;

  let settingsBufferByteLength = 8 * Uint32Array.BYTES_PER_ELEMENT;
  let settingsBuffer = device.createBuffer({ usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM, size: settingsBufferByteLength });
  settingsBuffer.byteLength = settingsBufferByteLength;
  settingsBuffer.setSubData(0, new Uint32Array([
    sampleCount,
    totalSampleCount,
    lights.length,
    window.width,
    window.height
  ]));

  let vertexShaderModule = device.createShaderModule({        code: loadShaderFile(`shaders/screen.vert`) });
  let fragmentShaderModule = device.createShaderModule({      code: loadShaderFile(`shaders/screen.frag`) });
  let rayGenShaderModule = device.createShaderModule({        code: loadShaderFile(`shaders/ray-generation.rgen`) });
  let rayCHitModule = device.createShaderModule({             code: loadShaderFile(`shaders/ray-closest-hit.rchit`) });
  let rayMissShaderModule = device.createShaderModule({       code: loadShaderFile(`shaders/ray-miss.rmiss`) });
  let rayShadowCHitShaderModule = device.createShaderModule({ code: loadShaderFile(`shaders/shadow-ray-closest-hit.rchit`) });
  let rayShadowMissShaderModule = device.createShaderModule({ code: loadShaderFile(`shaders/shadow-ray-miss.rmiss`) });

  let shaderBindingTable = device.createRayTracingShaderBindingTable({
    stages: [
      { module: rayGenShaderModule,        stage: GPUShaderStage.RAY_GENERATION },
      { module: rayCHitModule,             stage: GPUShaderStage.RAY_CLOSEST_HIT },
      { module: rayShadowCHitShaderModule, stage: GPUShaderStage.RAY_CLOSEST_HIT },
      { module: rayMissShaderModule,       stage: GPUShaderStage.RAY_MISS },
      { module: rayShadowMissShaderModule, stage: GPUShaderStage.RAY_MISS },
    ],
    groups: [
      { type: "general",             generalIndex:    0 },
      { type: "triangles-hit-group", closestHitIndex: 1 },
      { type: "triangles-hit-group", closestHitIndex: 2 },
      { type: "general",             generalIndex:    3 },
      { type: "general",             generalIndex:    4 },
    ]
  });

  let rtBindGroupLayout = device.createBindGroupLayout({
    bindings: [
      { binding: 0,  type: "acceleration-container", visibility: GPUShaderStage.RAY_GENERATION | GPUShaderStage.RAY_CLOSEST_HIT },
      { binding: 1,  type: "storage-buffer",         visibility: GPUShaderStage.RAY_GENERATION },
      { binding: 2,  type: "storage-buffer",         visibility: GPUShaderStage.RAY_GENERATION },
      { binding: 3,  type: "uniform-buffer",         visibility: GPUShaderStage.RAY_GENERATION | GPUShaderStage.RAY_CLOSEST_HIT },
      { binding: 4,  type: "uniform-buffer",         visibility: GPUShaderStage.RAY_GENERATION | GPUShaderStage.RAY_CLOSEST_HIT },
      { binding: 5,  type: "storage-buffer",         visibility: GPUShaderStage.RAY_GENERATION | GPUShaderStage.RAY_CLOSEST_HIT },
      { binding: 6,  type: "storage-buffer",         visibility: GPUShaderStage.RAY_GENERATION | GPUShaderStage.RAY_CLOSEST_HIT },
      { binding: 7,  type: "storage-buffer",         visibility: GPUShaderStage.RAY_GENERATION | GPUShaderStage.RAY_CLOSEST_HIT },
      { binding: 8,  type: "storage-buffer",         visibility: GPUShaderStage.RAY_GENERATION | GPUShaderStage.RAY_CLOSEST_HIT },
      { binding: 9,  type: "storage-buffer",         visibility: GPUShaderStage.RAY_GENERATION | GPUShaderStage.RAY_CLOSEST_HIT },
      { binding: 10, type: "sampler",                visibility: GPUShaderStage.RAY_CLOSEST_HIT },
      { binding: 11, type: "sampled-texture",        visibility: GPUShaderStage.RAY_CLOSEST_HIT, textureDimension: "2d-array" },
    ]
  });

  let rtBindGroup = device.createBindGroup({
    layout: rtBindGroupLayout,
    bindings: [
      { binding: 0,  size: 0,                             accelerationContainer: instanceContainer.instance },
      { binding: 1,  size: pixelBuffer.byteLength,        buffer: pixelBuffer },
      { binding: 2,  size: accumulationBuffer.byteLength, buffer: accumulationBuffer },
      { binding: 3,  size: camera.buffer.byteLength,      buffer: camera.buffer },
      { binding: 4,  size: settingsBuffer.byteLength,     buffer: settingsBuffer },
      { binding: 5,  size: attributeBuffer.byteLength,    buffer: attributeBuffer },
      { binding: 6,  size: faceBuffer.byteLength,         buffer: faceBuffer },
      { binding: 7,  size: instancesBuffer.byteLength,    buffer: instancesBuffer },
      { binding: 8,  size: materialBuffer.byteLength,     buffer: materialBuffer },
      { binding: 9,  size: lightsBuffer.byteLength,       buffer: lightsBuffer },
      { binding: 10, size: 0,                             sampler: textureSampler },
      { binding: 11, size: 0,                             textureView: textureView },
    ]
  });

  let rtPipeline = device.createRayTracingPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [rtBindGroupLayout]
    }),
    rayTracingState: {
      shaderBindingTable,
      maxRecursionDepth: 1
    }
  });

  let blitBindGroupLayout = device.createBindGroupLayout({
    bindings: [
      { binding: 0, type: "storage-buffer", visibility: GPUShaderStage.FRAGMENT },
      { binding: 1, type: "uniform-buffer", visibility: GPUShaderStage.FRAGMENT },
    ]
  });

  let blitBindGroup = device.createBindGroup({
    layout: blitBindGroupLayout,
    bindings: [
      { binding: 0, size: pixelBuffer.byteLength, buffer: pixelBuffer },
      { binding: 1, size: settingsBuffer.byteLength, buffer: settingsBuffer },
    ]
  });

  let blitPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [blitBindGroupLayout]
    }),
    sampleCount: 1,
    vertexStage: {
      module: vertexShaderModule,
      entryPoint: "main"
    },
    fragmentStage: {
      module: fragmentShaderModule,
      entryPoint: "main"
    },
    primitiveTopology: "triangle-list",
    vertexState: {
      indexFormat: "uint32",
      vertexBuffers: []
    },
    rasterizationState: {
      frontFace: "CCW",
      cullMode: "none"
    },
    colorStates: [{
      format: swapChainFormat,
      alphaBlend: {},
      colorBlend: {}
    }]
  });

  let isLeftMousePressed = false;
  window.onmousedown = e => {
    isLeftMousePressed = true;
  };
  window.onmouseup = e => {
    isLeftMousePressed = false;
  };
  window.onmousemove = e => {
    if (!isLeftMousePressed) return;
    camera.deltaMovement.x = e.movementX * 0.25;
    camera.deltaMovement.y = e.movementY * 0.25;
  };

  let keys = {};
  window.onkeydown = function(e) {
    let {keyCode} = e;
    let key = keyCodeToChar(keyCode);
    keys[key] = 1;
  };
  window.onkeyup = function(e) {
    let {keyCode} = e;
    let key = keyCodeToChar(keyCode);
    keys[key] = 0;
  };
  global.isKeyPressed = function isKeyPressed(key) {
    return keys[key] === 1;
  };

  let delta = 0;
  let last = Date.now();
  (function onFrame(now = Date.now()) {
    delta = (now - last) / 1e3;
    last = now;

    camera.update(delta);

    // accumulation
    if (camera.hasMoved) totalSampleCount = sampleCount;
    else totalSampleCount += sampleCount;
    settingsBuffer.setSubData(0, new Uint32Array([ sampleCount, totalSampleCount ]));

    let backBufferView = swapChain.getCurrentTextureView();

    // ray tracing pass
    {
      let commandEncoder = device.createCommandEncoder({});
      let passEncoder = commandEncoder.beginRayTracingPass({});
      passEncoder.setPipeline(rtPipeline);
      passEncoder.setBindGroup(0, rtBindGroup);
      passEncoder.traceRays(
        0, 1, 3,
        window.width, window.height, 1
      );
      passEncoder.endPass();
      queue.submit([ commandEncoder.finish() ]);
    }
    // raster pass
    {
      let commandEncoder = device.createCommandEncoder({});
      let passEncoder = commandEncoder.beginRenderPass({
        colorAttachments: [{
          clearColor: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: "clear",
          storeOp: "store",
          attachment: backBufferView
        }]
      });
      passEncoder.setPipeline(blitPipeline);
      passEncoder.setBindGroup(0, blitBindGroup);
      passEncoder.draw(3, 1, 0, 0);
      passEncoder.endPass();
      queue.submit([ commandEncoder.finish() ]);
    }

    swapChain.present();

    window.pollEvents();
    if (window.shouldClose()) return;

    setImmediate(() => onFrame());
  })();

})();
