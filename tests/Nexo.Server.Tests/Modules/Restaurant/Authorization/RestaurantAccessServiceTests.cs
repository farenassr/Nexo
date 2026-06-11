using Nexo.Server.Modules.Core.OrganizationContext;
using Nexo.Server.Modules.Core.ModuleGating;
using Nexo.Server.Modules.Restaurant.Authorization;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Restaurant.Authorization;

public sealed class RestaurantAccessServiceTests
{
    [Test]
    public async Task RequireAsync_DeniesAccess_WhenRestaurantModuleIsInactive()
    {
        var organizationId = Guid.Parse("22222222-2222-7222-8222-222222222222");
        var moduleGate = new RecordingModuleGate(ModuleGateResult.Inactive());
        var permissions = new RecordingRestaurantPermissionAuthorizer(RestaurantPermissionResult.Allowed());
        var service = new RestaurantAccessService(
            new FixedOrganizationContextProvider(organizationId),
            moduleGate,
            permissions);

        var result = await service.RequireAsync(RestaurantPermissions.ContextRead);

        await Assert.That(result.Succeeded).IsFalse();
        await Assert.That(result.Failure).IsEqualTo(RestaurantAccessFailure.ModuleInactive);
        await Assert.That(moduleGate.RequestedOrganizationId).IsEqualTo(organizationId);
        await Assert.That(moduleGate.RequestedModuleKey).IsEqualTo(NexoModules.Restaurant);
        await Assert.That(permissions.InvocationCount).IsEqualTo(0);
    }

    [Test]
    public async Task RequireAsync_InvokesPermissionContract_WhenRestaurantModuleIsActive()
    {
        var organizationId = Guid.Parse("33333333-3333-7333-8333-333333333333");
        var moduleGate = new RecordingModuleGate(ModuleGateResult.Active());
        var permissions = new RecordingRestaurantPermissionAuthorizer(RestaurantPermissionResult.Allowed());
        var service = new RestaurantAccessService(
            new FixedOrganizationContextProvider(organizationId),
            moduleGate,
            permissions);

        var result = await service.RequireAsync(RestaurantPermissions.ContextRead);

        await Assert.That(result.Succeeded).IsTrue();
        await Assert.That(result.OrganizationId).IsEqualTo(organizationId);
        await Assert.That(permissions.InvocationCount).IsEqualTo(1);
        await Assert.That(permissions.RequestedOrganizationId).IsEqualTo(organizationId);
        await Assert.That(permissions.RequestedPermission).IsEqualTo(RestaurantPermissions.ContextRead);
    }

    [Test]
    public async Task RequireAsync_DeniesAccess_WhenPermissionContractRejectsAction()
    {
        var organizationId = Guid.Parse("44444444-4444-7444-8444-444444444444");
        var service = new RestaurantAccessService(
            new FixedOrganizationContextProvider(organizationId),
            new RecordingModuleGate(ModuleGateResult.Active()),
            new RecordingRestaurantPermissionAuthorizer(RestaurantPermissionResult.Denied()));

        var result = await service.RequireAsync(RestaurantPermissions.ContextRead);

        await Assert.That(result.Succeeded).IsFalse();
        await Assert.That(result.Failure).IsEqualTo(RestaurantAccessFailure.PermissionDenied);
        await Assert.That(result.OrganizationId).IsEqualTo(organizationId);
    }

    private sealed class FixedOrganizationContextProvider(Guid organizationId) : IOrganizationContextProvider
    {
        public ValueTask<OrganizationContext> GetCurrentAsync(CancellationToken cancellationToken = default)
        {
            return ValueTask.FromResult(new OrganizationContext(organizationId));
        }
    }

    private sealed class RecordingModuleGate(ModuleGateResult result) : IModuleGate
    {
        public Guid RequestedOrganizationId { get; private set; }
        public string? RequestedModuleKey { get; private set; }

        public ValueTask<ModuleGateResult> EnsureActiveAsync(
            Guid organizationId,
            string moduleKey,
            CancellationToken cancellationToken = default)
        {
            RequestedOrganizationId = organizationId;
            RequestedModuleKey = moduleKey;

            return ValueTask.FromResult(result);
        }
    }

    private sealed class RecordingRestaurantPermissionAuthorizer(RestaurantPermissionResult result)
        : IRestaurantPermissionAuthorizer
    {
        public int InvocationCount { get; private set; }
        public Guid RequestedOrganizationId { get; private set; }
        public string? RequestedPermission { get; private set; }

        public ValueTask<RestaurantPermissionResult> AuthorizeAsync(
            Guid organizationId,
            string permission,
            CancellationToken cancellationToken = default)
        {
            InvocationCount++;
            RequestedOrganizationId = organizationId;
            RequestedPermission = permission;

            return ValueTask.FromResult(result);
        }
    }
}
